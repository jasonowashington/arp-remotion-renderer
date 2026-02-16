# Automated Realty Playbook — Render Remotion Renderer Service (Cloud + R2)

This repository is the **code package** that backs your n8n cloud orchestration workflow:
- n8n generates script/audio/captions/props
- Uploads assets to **Cloudflare R2 (private)**
- Calls this **Render-hosted API service** to render a Remotion video
- Service uploads MP4 + logs back to R2 and returns **signed URLs**

## Included
- `apps/render-service` — Express API (TypeScript) for Render.com
- `packages/remotion-video` — Remotion project with **premium faceless template** (Option B)
- Shared utilities for **R2 access + signed URLs**, **SRT parsing**, logging
- `n8n/` — your pipeline JSON (as provided) + fix notes

## Endpoints
- `GET /health`
- `POST /render/long`
- `POST /render/short` (optional)

### GET /health response
```json
{
  "ok": true,
  "service": "arp-remotion-renderer",
  "time": "2026-01-01T00:00:00.000Z"
}
```

### POST /render/long request body
```json
{
  "runId": "arp_YYYYMMDD_HHmmss",
  "composition": "ARP-Long-16x9",
  "audioKey": "runs/<runId>/audio/vo.mp3",
  "propsKey": "runs/<runId>/render/props.long.json",
  "captionsKey": "runs/<runId>/captions/captions.srt",
  "outputKey": "runs/<runId>/final/final_16x9.mp4",
  "logKey": "runs/<runId>/logs/render_long.log"
}
```

### Response
```json
{
  "ok": true,
  "outputKey": "...",
  "logKey": "...",
  "signed": {
    "videoUrl": "https://...signed...",
    "logUrl": "https://...signed..."
  }
}
```

## Local dev
1) Install Node 20+
2) `npm i`
3) `cp apps/render-service/.env.example apps/render-service/.env`
4) `npm run dev:service`

## Deploy to Render
**Build command**
```
npm ci && npm run build
```

**Start command**
```
npm run start:service
```

Set env vars from `apps/render-service/.env.example`.

