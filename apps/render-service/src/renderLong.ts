import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { env } from "./config";
import { downloadToBuffer, uploadBuffer, signedGetUrl } from "./r2";
import { parseSrt, segmentsToWordCues } from "./srt";
import { logger } from "./logger";
import type { RenderRequest } from "./schema";

export async function renderLong(req: RenderRequest) {
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

    const entry = path.join(__dirname, "../../packages/remotion-video/src/index.ts");
    const bundleLocation = await bundle({ entryPoint: entry, webpackOverride: (c) => c });

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
      chromiumOptions: { gl: env.REMOTION_GL as any }
    });

    const mp4 = await fs.readFile(outPath);
    await uploadBuffer(req.outputKey, mp4, "video/mp4");

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
}
