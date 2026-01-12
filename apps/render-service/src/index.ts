import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config";
import { logger } from "./logger";
import { RenderRequestSchema } from "./schema";
import { renderLong } from "./renderLong";

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "arp-remotion-renderer", time: new Date().toISOString() }));

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
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, service: "arp-remotion-render-service" });
});

// Optional: favicon to stop 404 spam in logs
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
app.get("/health/health", (_req, res) => res.status(200).json({ ok: true })); // alias

app.listen(env.PORT, () => logger.info(`ARP Render service listening on :${env.PORT}`));
