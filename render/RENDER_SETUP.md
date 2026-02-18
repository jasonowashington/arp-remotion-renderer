# Render.com Setup (Recommended)

Create a **Web Service**:
- Runtime: Node
- Region: your preference
- Health check path: `/health`

Expected `/health` response shape:
```json
{
	"ok": true,
	"service": "arp-remotion-renderer",
	"time": "2026-01-01T00:00:00.000Z"
}
```

## Build Command
```bash
npm ci && npm run build
```

## Start Command
```bash
npm run start:service
```

## Environment Variables (Render Dashboard → Environment)
Copy from:
`apps/render-service/.env.example`

Required:
- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET (recommended: arp-video-renders)
- SIGNED_URL_TTL_SECONDS (e.g. 604800)
Optional:
- REMOTION_CONCURRENCY (recommend 1–2)
- REMOTION_GL (swangle works on most)

## After deploy
Your base URL will look like:
`https://<service-name>.onrender.com`

n8n should use:
`renderApiBase = https://<service-name>.onrender.com`

Important:
- Do not set `renderApiBase` to a `workers.dev` URL protected by Cloudflare Access.
- If you see HTML titled `Sign in ・ Cloudflare Access`, the workflow is calling the wrong host.
- `Render Long (Render.com API)` must call the Render service host ending in `.onrender.com`.
