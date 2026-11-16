export type JobStatus = "queued" | "running" | "retry_wait" | "succeeded" | "failed";
export interface Job {
  id: string;
  ownerId: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  updatedAt: Date;
}

const transitions: Record<JobStatus, JobStatus[]> = {
  queued: ["running", "failed"],
  running: ["succeeded", "retry_wait", "failed"],
  retry_wait: ["running", "failed"],
  succeeded: [],
  failed: [],
};

export function moveJob(job: Job, next: JobStatus, now = new Date()): Job {
  if (!transitions[job.status].includes(next)) {
    throw new Error(`Invalid transition: ${job.status} -> ${next}`);
  }
  return { ...job, status: next, updatedAt: now };
}

export function recordFailure(job: Job, retryable: boolean): Job {
  const canRetry = retryable && job.attempts < job.maxAttempts;
  const updated = moveJob(job, canRetry ? "retry_wait" : "failed");
  return { ...updated, attempts: job.attempts + 1 };
}
