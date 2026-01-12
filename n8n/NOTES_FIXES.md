## Fix notes for the provided n8n JSON (high-impact)

- Your OpenAI HTTP Request nodes have empty `bodyParameters`. They must send `model` + `messages` (and ideally enforce JSON output).
- Your S3 nodes still reference `r2Bucket`/`r2Prefix` while `Set Manifest` sets `R2_BUCKET`/`R2_PREFIX`.
- `R2_PREFIX` should be an expression: `={{ 'runs/' + $json.runId }}`.
- Whisper should output SRT and be uploaded to R2 before render.
- QA Wait/resume requires a correct callback URL. In n8n.cloud, prefer “webhook-first publish” (store run manifest in R2).

This repo supplies the Render Remotion service your pipeline calls:
- /health
- /render/long
