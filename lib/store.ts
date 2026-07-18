// Job store for converted bundles.
//
// Serverless platforms (Vercel) run each request in a separate, ephemeral
// instance, so an in-memory store does NOT survive between the convert call and
// the later preview/download/deploy calls — that produced "Job expired".
//
// Fix: persist each bundle to Vercel Blob (durable + shared across instances)
// when BLOB_READ_WRITE_TOKEN is configured, with an in-memory fast-path/cache.
// With no token (local dev), it falls back to memory-only — unchanged behavior.
import { put, list, del, get, head } from "@vercel/blob";
import { createHash } from "node:crypto";
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
const META_PREFIX = "meta/"; // small per-job metadata for the admin dashboard
// Binary assets (images/fonts/video) are content-addressed here, shared
// across ALL jobs — see serializeFiles for why.
const ASSET_PREFIX = "assets/";

/** Lightweight metadata about a conversion (for the admin list). */
export interface JobMeta {
  id: string;
  sourceUrl: string;
  createdAt: number;
  fileCount: number;
  bytes: number;
}

function blobEnabled(): boolean {
  // @vercel/blob authenticates via EITHER an explicit BLOB_READ_WRITE_TOKEN OR
  // OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID) — the newer connected-store model.
  // Enable Blob if either is present so connected stores work without a token.
  return !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
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

function indexFiles(files: ConvertedFile[], previewFiles?: ConvertedFile[]): Map<string, ConvertedFile> {
  const fileIndex = new Map<string, ConvertedFile>();
  for (const f of files) fileIndex.set(normalize(f.path), f);
  for (const f of previewFiles || []) fileIndex.set(normalize(f.path), f);
  return fileIndex;
}

// ---- Serialization for Blob ----
// Binary files (images especially, after WebP self-hosting) are the dominant
// share of a job's bytes. Inlining them as base64 in the per-job JSON meant
// re-converting the SAME site N times re-uploaded the SAME ~30MB of images N
// times — that's what actually burned through the Blob free tier's 10GB
// transfer allowance in one afternoon of repeat testing, not real traffic.
// Instead, binaries are content-addressed: stored once at
// assets/<sha1>.<ext>, shared across every job that happens to reference the
// same bytes, and skipped entirely (via a cheap `head()` check) if a
// conversion of the same site has already uploaded that exact image.
interface SerializedFile {
  path: string;
  content?: string;
  assetHash?: string; // -> ASSET_PREFIX + assetHash, fetched lazily on read
}
interface SerializedBundle {
  sourceUrl: string;
  pages: ConvertReport["pages"];
  stats: ConvertReport["stats"];
  notes: string[];
  files: SerializedFile[];
  previewFiles?: SerializedFile[];
}

function extOf(path: string): string {
  const m = /\.[a-z0-9]+$/i.exec(path);
  return m ? m[0] : ".bin";
}

/** Bounded-concurrency map — many small head()/put() calls, not a flood. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

async function serializeFiles(files: ConvertedFile[]): Promise<SerializedFile[]> {
  return mapLimit(files, 8, async (f) => {
    if (!f.binary) return { path: f.path, content: f.content };
    const hash = createHash("sha1").update(f.binary).digest("hex") + extOf(f.path);
    const pathname = `${ASSET_PREFIX}${hash}`;
    try {
      const exists = await head(pathname).catch(() => null);
      if (!exists) {
        // Content-addressed by hash — the bytes at this path can never
        // change, so cache as long as Blob allows (unlike the per-job JSON,
        // which is invalidated by TTL_MS instead).
        await put(pathname, f.binary, {
          access: "private",
          addRandomSuffix: false,
          contentType: "application/octet-stream",
          cacheControlMaxAge: 31536000,
        });
      }
      return { path: f.path, assetHash: hash };
    } catch (err) {
      // Blob unavailable (e.g. transfer-limit pause) — this file just won't
      // survive to a cold instance; the in-memory copy still works for the
      // instance that did the conversion.
      console.error("[store] asset persist failed:", err);
      return { path: f.path };
    }
  });
}

async function deserializeFiles(files: SerializedFile[]): Promise<ConvertedFile[]> {
  return mapLimit(files, 8, async (f) => {
    if (!f.assetHash) return { path: f.path, content: f.content };
    try {
      const result = await get(`${ASSET_PREFIX}${f.assetHash}`, { access: "private" });
      if (!result?.stream) return { path: f.path };
      const buf = Buffer.from(await new Response(result.stream).arrayBuffer());
      return { path: f.path, binary: buf };
    } catch (err) {
      console.error("[store] asset fetch failed:", err);
      return { path: f.path };
    }
  });
}

async function serialize(report: ConvertReport): Promise<SerializedBundle> {
  return {
    sourceUrl: report.sourceUrl,
    pages: report.pages,
    stats: report.stats,
    notes: report.notes,
    files: await serializeFiles(report.files),
    previewFiles: report.previewFiles ? await serializeFiles(report.previewFiles) : undefined,
  };
}

async function deserialize(b: SerializedBundle): Promise<ConvertReport> {
  return {
    sourceUrl: b.sourceUrl,
    pages: b.pages,
    stats: b.stats,
    notes: b.notes,
    files: await deserializeFiles(b.files),
    previewFiles: b.previewFiles ? await deserializeFiles(b.previewFiles) : undefined,
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
  const job: Job = { id, report, fileIndex: indexFiles(report.files, report.previewFiles), createdAt: Date.now() };
  jobs.set(id, job);
  gcMemory();

  if (blobEnabled()) {
    try {
      const payload = JSON.stringify(await serialize(report));
      // Private store: blobs are read back with get({access:'private'}), which
      // authenticates via OIDC (BLOB_STORE_ID + VERCEL_OIDC_TOKEN).
      await put(`${BLOB_PREFIX}${id}.json`, payload, {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
        cacheControlMaxAge: TTL_MS / 1000,
      });
      // Small metadata sidecar so the admin dashboard can list conversions
      // without downloading every full bundle.
      const meta: JobMeta = {
        id,
        sourceUrl: report.sourceUrl,
        createdAt: job.createdAt,
        fileCount: report.files.length,
        bytes: report.files.reduce(
          (n, f) => n + (f.binary ? f.binary.length : Buffer.byteLength(f.content || "")),
          0
        ),
      };
      await put(`${META_PREFIX}${id}.json`, JSON.stringify(meta), {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
      });
      void trimBlob();
    } catch (err) {
      // Don't fail the conversion if the bundle can't be persisted; the warm
      // instance still has it in memory. Surfaces in Vercel function logs.
      console.error("[store] blob persist failed:", err);
    }
  }
  return job;
}

export async function getJob(id: string): Promise<Job | undefined> {
  const cached = jobs.get(id);
  if (cached) return cached;
  if (!blobEnabled()) return undefined;

  try {
    const result = await get(`${BLOB_PREFIX}${id}.json`, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return undefined;
    const text = await new Response(result.stream).text();
    const report = await deserialize(JSON.parse(text) as SerializedBundle);
    const job: Job = { id, report, fileIndex: indexFiles(report.files, report.previewFiles), createdAt: Date.now() };
    jobs.set(id, job); // populate per-instance cache
    return job;
  } catch {
    return undefined;
  }
}

/** List recent conversions (newest first) for the admin dashboard. */
export async function listJobs(): Promise<JobMeta[]> {
  if (!blobEnabled()) {
    return [...jobs.values()]
      .map((j) => ({
        id: j.id,
        sourceUrl: j.report.sourceUrl,
        createdAt: j.createdAt,
        fileCount: j.report.files.length,
        bytes: 0,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  try {
    const { blobs } = await list({ prefix: META_PREFIX });
    const metas = await Promise.all(
      blobs.map(async (b) => {
        try {
          const r = await get(b.pathname, { access: "private" });
          if (!r || r.statusCode !== 200 || !r.stream) return null;
          return JSON.parse(await new Response(r.stream).text()) as JobMeta;
        } catch {
          return null;
        }
      })
    );
    return metas
      .filter((m): m is JobMeta => !!m)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** Delete a conversion (bundle + metadata) from memory and Blob. */
export async function deleteJob(id: string): Promise<void> {
  jobs.delete(id);
  if (!blobEnabled()) return;
  try {
    const [{ blobs: a }, { blobs: b }] = await Promise.all([
      list({ prefix: `${BLOB_PREFIX}${id}.json` }),
      list({ prefix: `${META_PREFIX}${id}.json` }),
    ]);
    await Promise.all([...a, ...b].map((x) => del(x.url).catch(() => {})));
  } catch {
    /* non-fatal */
  }
}

export function normalize(p: string): string {
  return p.replace(/^\/+/, "").replace(/\/+$/, (m) => (m ? "" : m)) || "index.html";
}
