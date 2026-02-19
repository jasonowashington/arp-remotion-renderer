// jobs.ts
import { uploadBuffer, downloadToBuffer } from "./r2";
import { env } from "./config";

export type JobStatus = "queued" | "running" | "done" | "error";

export type JobRecord = {
  id: string;              // jobId
  runId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  request: any;
  result?: any;
  error?: string;
};

// Store under the run folder so it’s easy to inspect in R2
function jobKey(runId: string, jobId: string) {
  return `runs/${runId}/jobs/${jobId}.json`;
}

export async function createJob(id: string, request: any): Promise<JobRecord> {
  const now = new Date().toISOString();
  const runId = String(request?.runId || "").trim();
  if (!runId) throw new Error("createJob: request.runId is required");

  const job: JobRecord = {
    id,
    runId,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    request,
  };

  await uploadBuffer(
    jobKey(runId, id),
    Buffer.from(JSON.stringify(job, null, 2), "utf-8"),
    "application/json",
    env.R2_BUCKET
  );

  return job;
}

export async function updateJob(id: string, patch: Partial<JobRecord>, runId?: string) {
  // runId can be passed explicitly; otherwise try patch/runId/request/runId
  const inferredRunId =
    runId ||
    (patch.runId as string | undefined) ||
    (patch.request?.runId as string | undefined);

  if (!inferredRunId) throw new Error("updateJob: runId is required");

  const current = await getJob(id, inferredRunId);
  if (!current) throw new Error(`updateJob: job not found for runId=${inferredRunId}, id=${id}`);

  const next: JobRecord = {
    ...current,
    ...patch,
    id: patch.id ?? current.id,
    runId: inferredRunId,
    status: patch.status ?? current.status,
    createdAt: patch.createdAt ?? current.createdAt,
    request: patch.request ?? current.request,
    updatedAt: new Date().toISOString(),
  };

  await uploadBuffer(
    jobKey(inferredRunId, id),
    Buffer.from(JSON.stringify(next, null, 2), "utf-8"),
    "application/json",
    env.R2_BUCKET
  );

  return next;
}

export async function getJob(id: string, runId: string): Promise<JobRecord | null> {
  try {
    const buf = await downloadToBuffer(jobKey(runId, id), env.R2_BUCKET);
    return JSON.parse(buf.toString("utf-8")) as JobRecord;
  } catch {
    return null;
  }
}