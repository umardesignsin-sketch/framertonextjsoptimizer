// In-memory job store for converted bundles. Survives HMR via globalThis.
// NOTE: single-process only — fine for a local/preview tool. A production
// deployment would swap this for Redis/S3 or similar.
import type { ConvertReport, ConvertedFile } from "./types";

export interface Job {
  id: string;
  report: ConvertReport; // includes files
  fileIndex: Map<string, ConvertedFile>; // path -> file
  createdAt: number;
}

const g = globalThis as unknown as { __framerJobs?: Map<string, Job> };
const jobs: Map<string, Job> = (g.__framerJobs ??= new Map());

const MAX_JOBS = 25;
const TTL_MS = 1000 * 60 * 60; // 1h

function gc() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > TTL_MS) jobs.delete(id);
  }
  while (jobs.size > MAX_JOBS) {
    const oldest = [...jobs.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
    if (!oldest) break;
    jobs.delete(oldest.id);
  }
}

export function makeJobId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toLowerCase();
}

export function saveJob(id: string, report: ConvertReport): Job {
  const fileIndex = new Map<string, ConvertedFile>();
  for (const f of report.files) fileIndex.set(normalize(f.path), f);
  const job: Job = { id, report, fileIndex, createdAt: Date.now() };
  jobs.set(id, job);
  gc();
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function normalize(p: string): string {
  return p.replace(/^\/+/, "").replace(/\/+$/, (m) => (m ? "" : m)) || "index.html";
}
