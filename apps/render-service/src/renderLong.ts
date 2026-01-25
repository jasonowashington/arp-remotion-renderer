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

// Render queue: prevents concurrent renders to protect RAM
let renderQueue: Promise<void> = Promise.resolve();

async function withRenderLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = renderQueue;
  let release!: () => void;
  renderQueue = new Promise<void>((r) => (release = r));

  await prev; // wait for previous render to finish
  try {
    return await fn();
  } finally {
    release();
  }
}

function findRepoRoot(startDir: string) {
  let dir = startDir;

  for (let i = 0; i < 12; i++) {
    const hasPkg = existsSync(path.join(dir, "package.json"));
    const hasWorkspaces =
      existsSync(path.join(dir, "package-lock.json")) ||
      existsSync(path.join(dir, "pnpm-workspace.yaml"));
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

/**
 * ✅ Bundle caching (HUGE memory+speed win)
 * Your previous code bundled on every request.
 */
let cachedBundleLocation: string | null = null;
let inflightBundle: Promise<string> | null = null;

async function getBundleLocation(): Promise<string> {
  if (cachedBundleLocation) return cachedBundleLocation;
  if (inflightBundle) return inflightBundle;

  inflightBundle = (async () => {
    const loc = await bundle({
      entryPoint,
      webpackOverride: (config) => config,
    });
    cachedBundleLocation = loc;
    inflightBundle = null;
    console.log("[render] cachedBundleLocation=", cachedBundleLocation);
    return loc;
  })();

  return inflightBundle;
}

export async function renderLong(req: RenderRequest) {
  return withRenderLock(async () => {
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
        downloadToBuffer(req.audioKey),
      ]);

      const propsJson = JSON.parse(propsBuf.toString("utf-8")) as any;

      if (req.captionsKey) {
        const capBuf = await downloadToBuffer(req.captionsKey);
        const segments = parseSrt(capBuf.toString("utf-8"));
        propsJson.captions = segmentsToWordCues(segments);
        log(`Captions loaded: segments=${segments.length} wordCues=${propsJson.captions.length}`);
      }

      // ✅ Fetch mp3 over HTTP
      const audioSrc = await signedGetUrl(req.audioKey);
      log(`audioSrc=${audioSrc}`);

      const bundleLocation = await getBundleLocation();
      console.log("[render] bundleLocation=", bundleLocation);
      console.log("[render] bundleExists=", existsSync(bundleLocation));

      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: req.composition,
        // ✅ pass audioSrc (NOT audioPath)
        inputProps: { ...propsJson, audioSrc },
      });

      const outPath = path.join(tmpDir, "output.mp4");

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: "h264",
        outputLocation: outPath,
        // ✅ pass audioSrc (NOT audioPath)
        inputProps: { ...propsJson, audioSrc },
        concurrency: env.REMOTION_CONCURRENCY,
        chromiumOptions: { gl: env.REMOTION_GL as any },
      });

      // ✅ Stream upload (no buffering)
      try {
        await uploadFile(req.outputKey, outPath, "video/mp4");
      } finally {
        // Delete MP4 even if upload fails
        await fs.unlink(outPath).catch(() => {});
      }

      const logText = logLines.join("\n") + "\n";
      await uploadBuffer(req.logKey, Buffer.from(logText, "utf-8"), "text/plain");

      const [videoUrl, logUrl] = await Promise.all([
        signedGetUrl(req.outputKey),
        signedGetUrl(req.logKey),
      ]);

      return { ok: true, outputKey: req.outputKey, logKey: req.logKey, signed: { videoUrl, logUrl } };
    } catch (e: any) {
      const errLine = `ERROR: ${e?.stack || e?.message || String(e)}`;
      logLines.push(errLine);
      try {
        await uploadBuffer(req.logKey, Buffer.from(logLines.join("\n") + "\n", "utf-8"), "text/plain");
      } catch {}
      throw e;
    } finally {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  });
}