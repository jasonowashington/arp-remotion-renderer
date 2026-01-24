import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import { env } from "./config";
import { logger } from "./logger";
import { RenderRequestSchema } from "./schema";
import { renderLong } from "./renderLong";
import { uploadBuffer, downloadToBuffer } from "./r2";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "arp-remotion-renderer", time: new Date().toISOString() }));

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
    
    logger.info(`R2 Upload successful: ${key} (${req.file.size} bytes)`);
    res.json({ ok: true, key, bucket: finalBucket, size: req.file.size });
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

// Root route so Render/browser doesn't show "Cannot GET /"
app.get("/", (_req, res) => {
  res.status(200).type("text").send("ARP Remotion Renderer is online ✅");
});

// Health check endpoint (useful for monitoring / warmup gates)
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "arp-remotion-render-service" });
});

// Optional: favicon to stop 404 spam in logs
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
app.get("/health/health", (_req, res) => res.status(200).json({ ok: true })); // alias

app.listen(env.PORT, () => logger.info(`ARP Render service listening on :${env.PORT}`));

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED_REJECTION", err);
});

process.on("exit", (code) => {
  console.error("PROCESS_EXIT", code);
});