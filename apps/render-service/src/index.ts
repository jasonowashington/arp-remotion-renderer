import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import crypto from "node:crypto";

import { env } from "./config";
import { logger } from "./logger";
import { RenderRequestSchema } from "./schema";
import { renderLong } from "./renderLong";
import { uploadBuffer, downloadToBuffer, signedGetUrl, existsKey } from "./r2";
import { createJob, getJob, updateJob } from "./jobs";

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

app.get("/health", (_req, res) => res.json(getHealthPayload()));
app.get("/render/health", (_req, res) => res.status(200).json({ ok: true, service: "arp-remotion-renderer", ts: Date.now() }));

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
 *  ASYNC Render Long (NO HANG)
 *  ========================= */
app.post("/render/long", async (req, res) => {
  const parsed = RenderRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const data = parsed.data;
  const bucket = env.R2_BUCKET;

  // Validate the required inputs exist in R2 BEFORE queueing
  const requiredKeys = [
    { name: "audioKey", key: data.audioKey },
    { name: "propsKey", key: data.propsKey },
    { name: "captionsKey", key: data.captionsKey },
  ];

  const missing: string[] = [];
  for (const k of requiredKeys) {
    if (!k.key) missing.push(`${k.name} (empty)`);
    else {
      const ok = await existsKey(k.key, bucket);
      if (!ok) missing.push(`${k.name}: ${k.key}`);
    }
  }

  if (missing.length) {
    return res.status(400).json({ ok: false, error: "Missing required R2 objects", missing });
  }

  const jobId = crypto.randomUUID();
  createJob(jobId, data);

  // fire-and-forget
  (async () => {
    try {
      updateJob(jobId, { status: "running" });
      const out = await renderLong(data);
      updateJob(jobId, { status: "done", result: out });
    } catch (e: any) {
      updateJob(jobId, { status: "error", error: e?.message || String(e) });
    }
  })();

  // ✅ Immediate response (this is what stops n8n hanging)
  return res.status(202).json({ ok: true, jobId, runId: data.runId, status: "queued" });
});

app.get("/render/status/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ ok: false, error: "Job not found" });
  return res.json({ ok: true, job });
});

app.get("/render/long", (_req, res) => {
  res.status(405).json({ ok: false, error: "Method not allowed. Use POST /render/long with a JSON body." });
});

// Root routes
app.get("/", (_req, res) => res.status(200).type("text").send("ARP Remotion Renderer is online ✅"));
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

process.on("uncaughtException", (err) => console.error("UNCAUGHT_EXCEPTION", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED_REJECTION", err));
process.on("exit", (code) => console.error("PROCESS_EXIT", code));

/** ✅ LISTEN LAST */
app.listen(env.PORT, () => logger.info(`ARP Render service listening on :${env.PORT}`));