import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import { env } from "./config";
import { logger } from "./logger";
import { RenderRequestSchema } from "./schema";
import { renderLong } from "./renderLong";
import { uploadBuffer, downloadToBuffer, signedGetUrl } from "./r2";
import crypto from "node:crypto";
import { createJob, getJob, updateJob } from "./jobs";


const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

const getHealthPayload = () => ({
  ok: true,
  service: "arp-remotion-renderer",
  time: new Date().toISOString()
});

app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => res.json(getHealthPayload()));

// R2 Proxy Endpoints
app.post("/api/r2/upload", upload.single("file"), async (req, res) => {
  try {
    const { bucket, key, contentType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file provided" });
    }
    
    if (!key) {
      return res.status(400).json({ ok: false, error: "Missing 'key' parameter" });
    }

    const finalBucket = bucket || env.R2_BUCKET;
    const finalContentType = contentType || req.file.mimetype || "application/octet-stream";

    await uploadBuffer(key, req.file.buffer, finalContentType, finalBucket);
    
    // ✅ Sign manifest uploads ONLY
    const shouldSign = key.endsWith("/manifest.json") || key === "manifest.json";
    const manifestUrl = shouldSign ? await signedGetUrl(key, finalBucket) : undefined;
    
    logger.info(`R2 Upload successful: ${key} (${req.file.size} bytes)${manifestUrl ? ' [SIGNED]' : ''}`);
    
    const response: any = { ok: true, key, bucket: finalBucket, size: req.file.size };
    if (manifestUrl) {
      response.manifestUrl = manifestUrl;
    }
    res.json(response);
  } catch (e: any) {
    logger.error("R2 Upload failed:", e);
    res.status(500).json({ ok: false, error: e?.message || "Upload failed" });
  }
});

app.post("/api/r2/download", async (req, res) => {
  try {
    const { bucket, key } = req.body;
    
    if (!key) {
      return res.status(400).json({ ok: false, error: "Missing 'key' parameter" });
    }

    const finalBucket = bucket || env.R2_BUCKET;
    const buffer = await downloadToBuffer(key, finalBucket);
    
    // Return as binary
    res.set("Content-Type", "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${key.split('/').pop()}"`);
    res.send(buffer);
    
    logger.info(`R2 Download successful: ${key} (${buffer.length} bytes)`);
  } catch (e: any) {
    logger.error("R2 Download failed:", e);
    res.status(500).json({ ok: false, error: e?.message || "Download failed" });
  }
});

app.post("/render/long", async (req, res) => {
  const parsed = RenderRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  try {
    const out = await renderLong(parsed.data);
    res.json(out);
  } catch (e: any) {
    logger.error(e);
    res.status(500).json({ ok: false, error: e?.message || "Render failed" });
  }
});

app.get("/render/long", (_req, res) => {
  res.status(405).json({
    ok: false,
    error: "Method not allowed. Use POST /render/long with a JSON body."
  });
});

app.post("/render/short", async (req, res) => {
  const parsed = RenderRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  try {
    const out = await renderLong(parsed.data);
    res.json(out);
  } catch (e: any) {
    logger.error(e);
    res.status(500).json({ ok: false, error: e?.message || "Render failed" });
  }
});

app.get("/render/short", (_req, res) => {
  res.status(405).json({
    ok: false,
    error: "Method not allowed. Use POST /render/short with a JSON body."
  });
});

// Root route so Render/browser doesn't show "Cannot GET /"
app.get("/", (_req, res) => {
  res.status(200).type("text").send("ARP Remotion Renderer is online ✅");
});

// Optional: favicon to stop 404 spam in logs
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

app.get("/health/health", (_req, res) => res.status(200).json(getHealthPayload())); // alias

app.listen(env.PORT, () => logger.info(`ARP Render service listening on :${env.PORT}`));

app.post("/render/long/start", async (req, res) => {
  const parsed = RenderRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const jobId = crypto.randomUUID();
  createJob(jobId, parsed.data);

  // Fire-and-forget render (but still protected by your render lock inside renderLong)
  (async () => {
    try {
      updateJob(jobId, { status: "running" });
      const out = await renderLong(parsed.data);
      updateJob(jobId, { status: "done", result: out });
    } catch (e: any) {
      updateJob(jobId, { status: "error", error: e?.message || String(e) });
    }
  })();

  return res.status(202).json({
  ok: true,
  jobId,
  ...parsed.data, // 👈 echoes runId, propsKey, audioKey, etc.
  });
});

app.get("/render/status/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ ok: false, error: "Job not found" });

  return res.json({ ok: true, job });
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED_REJECTION", err);
});

process.on("exit", (code) => {
  console.error("PROCESS_EXIT", code);
});