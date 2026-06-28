// Job store for converted bundles.
//
// Serverless platforms (Vercel) run each request in a separate, ephemeral
// instance, so an in-memory store does NOT survive between the convert call and
// the later preview/download/deploy calls — that produced "Job expired".
//
// Fix: persist each bundle to Vercel Blob (durable + shared across instances)
// when BLOB_READ_WRITE_TOKEN is configured, with an in-memory fast-path/cache.
// With no token (local dev), it falls back to memory-only — unchanged behavior.
import { put, list, del } from "@vercel/blob";
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
const TTL_MS = 1000 * 60 * 60; // 1h (in-memory cache)
const BLOB_PREFIX = "jobs/";

function blobEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function gcMemory() {
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

function indexFiles(files: ConvertedFile[]): Map<string, ConvertedFile> {
  const fileIndex = new Map<string, ConvertedFile>();
  for (const f of files) fileIndex.set(normalize(f.path), f);
  return fileIndex;
}

// ---- Serialization for Blob (binary -> base64) ----
interface SerializedFile {
  path: string;
  content?: string;
  b64?: string;
}
interface SerializedBundle {
  sourceUrl: string;
  pages: ConvertReport["pages"];
  stats: ConvertReport["stats"];
  notes: string[];
  files: SerializedFile[];
}

function serialize(report: ConvertReport): SerializedBundle {
  return {
    sourceUrl: report.sourceUrl,
    pages: report.pages,
    stats: report.stats,
    notes: report.notes,
    files: report.files.map((f) => ({
      path: f.path,
      content: f.binary ? undefined : f.content,
      b64: f.binary ? f.binary.toString("base64") : undefined,
    })),
  };
}

function deserialize(b: SerializedBundle): ConvertReport {
  return {
    sourceUrl: b.sourceUrl,
    pages: b.pages,
    stats: b.stats,
    notes: b.notes,
    files: b.files.map((f) => ({
      path: f.path,
      content: f.b64 ? undefined : f.content,
      binary: f.b64 ? Buffer.from(f.b64, "base64") : undefined,
    })),
  };
}

/** Best-effort: keep only the most recent MAX_JOBS bundles in Blob. */
async function trimBlob() {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    if (blobs.length <= MAX_JOBS) return;
    const old = blobs
      .sort((a, b) => +new Date(a.uploadedAt) - +new Date(b.uploadedAt))
      .slice(0, blobs.length - MAX_JOBS);
    await Promise.all(old.map((x) => del(x.url).catch(() => {})));
  } catch {
    /* non-fatal */
  }
}

export async function saveJob(id: string, report: ConvertReport): Promise<Job> {
  const job: Job = { id, report, fileIndex: indexFiles(report.files), createdAt: Date.now() };
  jobs.set(id, job);
  gcMemory();

  if (blobEnabled()) {
    const payload = JSON.stringify(serialize(report));
    await put(`${BLOB_PREFIX}${id}.json`, payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: TTL_MS / 1000,
    });
    void trimBlob();
  }
  return job;
}

export async function getJob(id: string): Promise<Job | undefined> {
  const cached = jobs.get(id);
  if (cached) return cached;
  if (!blobEnabled()) return undefined;

  try {
    const { blobs } = await list({ prefix: `${BLOB_PREFIX}${id}.json`, limit: 1 });
    if (!blobs.length) return undefined;
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return undefined;
    const report = deserialize((await res.json()) as SerializedBundle);
    const job: Job = { id, report, fileIndex: indexFiles(report.files), createdAt: Date.now() };
    jobs.set(id, job); // populate per-instance cache
    return job;
  } catch {
    return undefined;
  }
}

export function normalize(p: string): string {
  return p.replace(/^\/+/, "").replace(/\/+$/, (m) => (m ? "" : m)) || "index.html";
}
