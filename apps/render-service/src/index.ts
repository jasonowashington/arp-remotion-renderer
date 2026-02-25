import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import crypto from "node:crypto";

import { env } from "./config";
import { logger } from "./logger";
import { RenderRequestSchema } from "./schema";
import { renderLong } from "./renderLong";
import { uploadBuffer, downloadToBuffer, signedGetUrl } from "./r2";
import { createJob, getJob, updateJob } from "./jobs";

console.log("🚀 ARP Render Service booted (async jobs enabled)");

const app = express();

/** ✅ MIDDLEWARE FIRST */
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const getHealthPayload = () => ({
  ok: true,
  service: "arp-remotion-renderer",
  time: new Date().toISOString(),
});

/** ✅ HEALTH */
app.get("/health", (_req, res) => res.json(getHealthPayload()));
app.get("/render/health", (_req, res) =>
  res.status(200).json({ ok: true, service: "arp-remotion-renderer", ts: Date.now() })
);

/** =========================
 *  R2 Proxy Endpoints
 *  ========================= */
app.post("/api/r2/upload", upload.single("file"), async (req, res) => {
  try {
    const { bucket, key, contentType } = req.body;

    if (!req.file) return res.status(400).json({ ok: false, error: "No file provided" });
    if (!key) return res.status(400).json({ ok: false, error: "Missing 'key' parameter" });

    const finalBucket = bucket || env.R2_BUCKET;
    const finalContentType = contentType || req.file.mimetype || "application/octet-stream";

    await uploadBuffer(key, req.file.buffer, finalContentType, finalBucket);

    // Sign manifest uploads only
    const shouldSign = key.endsWith("/manifest.json") || key === "manifest.json";
    const manifestUrl = shouldSign ? await signedGetUrl(key, finalBucket) : undefined;

    const response: any = { ok: true, key, bucket: finalBucket, size: req.file.size };
    if (manifestUrl) response.manifestUrl = manifestUrl;

    return res.json(response);
  } catch (e: any) {
    logger.error("R2 Upload failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Upload failed" });
  }
});

app.post("/api/r2/download", async (req, res) => {
  try {
    const { bucket, key } = req.body;
    if (!key) return res.status(400).json({ ok: false, error: "Missing 'key' parameter" });

    const finalBucket = bucket || env.R2_BUCKET;
    const buffer = await downloadToBuffer(key, finalBucket);

    res.set("Content-Type", "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${key.split("/").pop()}"`);
    return res.send(buffer);
  } catch (e: any) {
    logger.error("R2 Download failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Download failed" });
  }
});

/** =========================
 *  ASYNC RENDER LONG (NON-BLOCKING)
 *  ========================= */
app.post("/render/long/start", (req, res) => {
  const parsed = RenderRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const data = parsed.data;
  const jobId = crypto.randomUUID();

  // Create job synchronously (no awaits)
  createJob(jobId, data);

  // ✅ Respond immediately so n8n never hangs
  res.status(202).json({
    ok: true,
    jobId,
    runId: data.runId,
    status: "queued",
  });

  // Fire-and-forget background render
  (async () => {
    try {
      updateJob(jobId, { status: "running" });

      const out = await renderLong(data);

      updateJob(jobId, { status: "done", result: out });
    } catch (err: any) {
      updateJob(jobId, { status: "error", error: err?.message || String(err) });
      logger.error("Render failed:", err);
    }
  })();
});

/** ✅ STATUS ENDPOINT (THIS WAS MISSING) */
app.get("/render/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const { runId } = req.query;

  if (!runId) {
    return res.status(400).json({ ok: false, error: "Missing 'runId' query parameter" });
  }

  const job = getJob(jobId, String(runId));
  if (!job) {
    // Always return JSON (never HTML)
    return res.status(404).json({ ok: false, error: "Job not found", jobId });
  }

  return res.json({
    ok: true,
    job, // job.status is inside here
  });
});

/** ✅ Friendly method guard */
app.get("/render/long/start", (_req, res) =>
  res.status(405).json({ ok: false, error: "Method not allowed. Use POST /render/long/start" })
);

/** Root routes */
app.get("/", (_req, res) => res.status(200).type("text").send("ARP Remotion Renderer is online ✅"));
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

/** ✅ JSON 404 handler (prevents HTML that breaks n8n JSON parsing) */
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

process.on("uncaughtException", (err) => console.error("UNCAUGHT_EXCEPTION", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED_REJECTION", err));
process.on("exit", (code) => console.error("PROCESS_EXIT", code));

/** ✅ LISTEN LAST */
app.listen(env.PORT, () => logger.info(`ARP Render service listening on :${env.PORT}`));