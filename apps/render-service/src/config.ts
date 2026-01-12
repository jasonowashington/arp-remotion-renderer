import { z } from "zod";
import "dotenv/config";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8787),
  CORS_ORIGIN: z.string().default("*"),

  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1).default("arp-video-renders"),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().default(604800),

  REMOTION_CONCURRENCY: z.coerce.number().default(2),
  REMOTION_GL: z.string().default("swangle")
});

export const env = EnvSchema.parse(process.env);
export const r2Endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
