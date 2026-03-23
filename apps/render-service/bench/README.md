Benchmarking the render service

Usage (requires the render service to be running and accessible):

PowerShell example:

```powershell
# $env:RENDER_API_BASE = 'http://localhost:8787'
# node scripts/benchmark_render.js path/to/sample_payload.json 2
```

The sample payload must be a JSON object compatible with the `/render/long` endpoint (include `propsKey`, `audioKey`, `captionsKey`, `runId`, etc.). The script submits N jobs and polls `/render/status/:jobId` until completion and prints durations.
