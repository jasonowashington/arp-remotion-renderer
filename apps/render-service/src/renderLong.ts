import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { env } from "./config";
import { downloadToBuffer, uploadBuffer, uploadFile, signedGetUrl } from "./r2";
import { parseSrt, segmentsToWordCues } from "./srt";
import { logger } from "./logger";
import type { RenderRequest } from "./schema";
 

// Render mutex: prevents concurrent renders to protect RAM
let renderInFlight: Promise<any> | null = null;

function findRepoRoot(startDir: string) {
  let dir = startDir;

  for (let i = 0; i < 12; i++) {
    const hasPkg = existsSync(path.join(dir, "package.json"));
    const hasWorkspaces = existsSync(path.join(dir, "package-lock.json")) || existsSync(path.join(dir, "pnpm-workspace.yaml"));
    const hasPackagesDir = existsSync(path.join(dir, "packages"));
    const hasAppsDir = existsSync(path.join(dir, "apps"));

    // ✅ Only accept as repo root if it looks like monorepo root
    if (hasPkg && (hasWorkspaces || hasPackagesDir || hasAppsDir)) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return startDir;
}

const repoRoot = findRepoRoot(process.cwd());

// ✅ Use ENV override, default to your known-good path
const entryRel = process.env.REMOTION_ENTRYPOINT || "packages/remotion-video/src/index.ts";
const entryPoint = path.resolve(repoRoot, entryRel);

console.log("[render] cwd:", process.cwd());
console.log("[render] repoRoot:", repoRoot);
console.log("[render] entryRel:", entryRel);
console.log("[render] entryPoint:", entryPoint);
console.log("[render] entryExists:", existsSync(entryPoint));
console.log("[render] packagesDirExists:", existsSync(path.join(repoRoot, "packages")));


if (!existsSync(entryPoint)) {
  throw new Error(`Remotion entryPoint not found: ${entryPoint}`);
}

async function getBundleLocation(): Promise<string> {
  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });
  return bundleLocation;
}

export async function renderLong(req: RenderRequest) {
  // Serialize renders to protect RAM
  const run = async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "arp-render-"));
    const logLines: string[] = [];
    const log = (msg: string) => {
      const line = `[${new Date().toISOString()}] ${msg}`;
      logLines.push(line);
      logger.info(line);
    };

    try {
    log(`Starting render runId=${req.runId} composition=${req.composition}`);

    const [propsBuf, audioBuf] = await Promise.all([
      downloadToBuffer(req.propsKey),
      downloadToBuffer(req.audioKey)
    ]);

    const propsJson = JSON.parse(propsBuf.toString("utf-8")) as any;

    if (req.captionsKey) {
      const capBuf = await downloadToBuffer(req.captionsKey);
      const segments = parseSrt(capBuf.toString("utf-8"));
      propsJson.captions = segmentsToWordCues(segments);
      log(`Captions loaded: segments=${segments.length} wordCues=${propsJson.captions.length}`);
    }

    const audioPath = path.join(tmpDir, "vo.mp3");
    await fs.writeFile(audioPath, audioBuf);

    const bundleLocation = await getBundleLocation();
    console.log("[render] bundleLocation=", bundleLocation);
    console.log("[render] bundleExists=", existsSync(bundleLocation));

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: req.composition,
      inputProps: { ...propsJson, audioPath }
    });

    const outPath = path.join(tmpDir, "output.mp4");
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outPath,
      inputProps: { ...propsJson, audioPath },
      concurrency: env.REMOTION_CONCURRENCY,
      chromiumOptions: { gl: env.REMOTION_GL as any,
        args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"]
       }
    });

    // Stream upload (no buffering)
try {
  await uploadFile(req.outputKey, outPath, "video/mp4");
} finally {
  // Delete MP4 even if upload fails
  await fs.unlink(outPath).catch(() => {});

}

    const logText = logLines.join("\n") + "\n";
    await uploadBuffer(req.logKey, Buffer.from(logText, "utf-8"), "text/plain");

    const [videoUrl, logUrl] = await Promise.all([signedGetUrl(req.outputKey), signedGetUrl(req.logKey)]);

    return { ok: true, outputKey: req.outputKey, logKey: req.logKey, signed: { videoUrl, logUrl } };
  } catch (e: any) {
    const errLine = `ERROR: ${e?.stack || e?.message || String(e)}`;
    logLines.push(errLine);
    try {
      await uploadBuffer(req.logKey, Buffer.from(logLines.join("\n") + "\n", "utf-8"), "text/plain");
    } catch {}
      throw e;
    } finally {
      try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch {}
    }
  };

  // If something is already rendering, wait for it
  while (renderInFlight) {
    await renderInFlight.catch(() => {});
  }

  renderInFlight = run();
  try {
    return await renderInFlight;
  } finally {
    renderInFlight = null;
  }
}
