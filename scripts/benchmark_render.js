#!/usr/bin/env node
const fs = require('fs');
const fetch = global.fetch || require('node-fetch');
const { randomUUID } = require('crypto');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const base = process.env.RENDER_API_BASE || 'http://localhost:8787';
  const payloadPath = process.argv[2] || process.env.SAMPLE_PAYLOAD_PATH;
  const jobs = Number(process.env.JOBS || process.argv[3] || 2);
  if (!payloadPath) {
    console.error('Usage: node scripts/benchmark_render.js <payload.json> [jobs]');
    process.exit(2);
  }

  const raw = fs.readFileSync(payloadPath, 'utf-8');
  const basePayload = JSON.parse(raw);

  console.log(`Bench: sending ${jobs} jobs to ${base}/render/long using ${payloadPath}`);

  const starts = new Map();
  const results = [];

  // submit jobs
  const submits = Array.from({length: jobs}).map(async (_, i) => {
    const payload = { ...basePayload };
    payload.runId = payload.runId || `bench-${randomUUID()}`;
    const res = await fetch(`${base}/render/long`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
    });
    const body = await res.json().catch(() => ({}));
    const jobId = body.jobId || body.job?.id;
    if (!jobId) {
      console.error('Submit failed:', body);
      return { jobId: null, error: body };
    }
    starts.set(jobId, Date.now());
    console.log(`[submit] job=${jobId} runId=${payload.runId}`);
    return { jobId, runId: payload.runId };
  });

  const submitted = (await Promise.all(submits)).filter(Boolean);
  if (!submitted.length) {
    console.error('No jobs submitted. Aborting.');
    process.exit(1);
  }

  // poll for completion
  const pollInterval = 5000;
  const timeoutMs = Number(process.env.TIMEOUT_MS || 1000 * 60 * 60 * 6); // 6h default

  await Promise.all(submitted.map(async ({ jobId }) => {
    if (!jobId) return;
    const start = starts.get(jobId) || Date.now();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const r = await fetch(`${base}/render/status/${jobId}`);
        const j = await r.json().catch(() => ({}));
        const status = j.job?.status || j.status || (j.job && j.job.status);
        if (status === 'done' || status === 'error') {
          const dur = Date.now() - start;
          console.log(`[done] job=${jobId} status=${status} duration_ms=${dur}`);
          results.push({ jobId, status, durationMs: dur, info: j.job || j });
          return;
        }
      } catch (e) {
        console.error('Poll error for', jobId, e?.message || e);
      }
      await wait(pollInterval);
    }
    console.error('Timeout waiting for job', jobId);
    results.push({ jobId, status: 'timeout' });
  }));

  // summary
  console.log('\nBenchmark summary:');
  results.forEach(r => console.log(JSON.stringify(r)));
  const done = results.filter(r => r.status === 'done');
  if (done.length) {
    const avg = done.reduce((s, x) => s + x.durationMs, 0) / done.length;
    console.log(`Average done duration_ms=${Math.round(avg)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
