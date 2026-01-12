import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { env, r2Endpoint } from "./config";

export const s3 = new S3Client({
  region: "auto",
  endpoint: r2Endpoint,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  forcePathStyle: true
});

export async function downloadToBuffer(key: string, bucket = env.R2_BUCKET): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`R2 missing body for key=${key}`);
  const stream = res.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

export async function uploadBuffer(key: string, data: Buffer, contentType: string, bucket = env.R2_BUCKET) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType }));
}

export async function signedGetUrl(key: string, bucket = env.R2_BUCKET, expiresSec = env.SIGNED_URL_TTL_SECONDS) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresSec });
}
