export type JobStatus = "queued" | "running" | "done" | "error";

export type JobRecord = {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  request: any;
  result?: any;
  error?: string;
};

const jobs = new Map<string, JobRecord>();

export function createJob(id: string, request: any): JobRecord {
  const now = new Date().toISOString();
  const job: JobRecord = { id, status: "queued", createdAt: now, updatedAt: now, request };
  jobs.set(id, job);
  return job;
}

export function updateJob(id: string, patch: Partial<JobRecord>) {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

export function getJob(id: string) {
  return jobs.get(id);
}
