// Job store for converted bundles.
//
// Serverless platforms (Vercel) run each request in a separate, ephemeral
// instance, so an in-memory store does NOT survive between the convert call and
// the later preview/download/deploy calls — that produced "Job expired".
//
// Fix: persist each bundle to durable object storage (shared across
// instances) with an in-memory fast-path/cache. The backend — Cloudflare R2
// or Vercel Blob — is picked from the environment by lib/blob-driver.ts;
// with neither configured (local dev), it falls back to memory-only.
import { activeDriver } from "./blob-driver";
import { createHash } from "node:crypto";
import { db, dbConfigured } from "./db";
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
  const drv = activeDriver();
  return mapLimit(files, 8, async (f) => {
    if (!f.binary) return { path: f.path, content: f.content };
    const hash = createHash("sha1").update(f.binary).digest("hex") + extOf(f.path);
    const pathname = `${ASSET_PREFIX}${hash}`;
    try {
      if (!drv) return { path: f.path };
      const exists = await drv.head(pathname);
      if (!exists) {
        // Content-addressed by hash — the bytes at this path can never
        // change, so cache as long as the store allows (unlike the per-job
        // JSON, which is invalidated by TTL_MS instead).
        await drv.put(pathname, f.binary, "application/octet-stream", 31536000);
      }
      return { path: f.path, assetHash: hash };
    } catch (err) {
      // Storage unavailable (e.g. transfer-limit pause) — this file just
      // won't survive to a cold instance; the in-memory copy still works for
      // the instance that did the conversion.
      console.error("[store] asset persist failed:", err);
      return { path: f.path };
    }
  });
}

async function deserializeFiles(files: SerializedFile[]): Promise<ConvertedFile[]> {
  const drv = activeDriver();
  return mapLimit(files, 8, async (f) => {
    if (!f.assetHash) return { path: f.path, content: f.content };
    try {
      const buf = drv ? await drv.getBuffer(`${ASSET_PREFIX}${f.assetHash}`) : null;
      if (!buf) return { path: f.path };
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

/** Best-effort: keep only the most recent MAX_JOBS bundles in storage. */
async function trimBlob() {
  try {
    const drv = activeDriver();
    if (!drv) return;
    const objects = await drv.list(BLOB_PREFIX);
    if (objects.length <= MAX_JOBS) return;
    const old = objects
      .sort((a, b) => +a.uploadedAt - +b.uploadedAt)
      .slice(0, objects.length - MAX_JOBS);
    await drv.del(old.map((x) => x.ref));
  } catch {
    /* non-fatal */
  }
}

export async function saveJob(id: string, report: ConvertReport): Promise<Job> {
  const job: Job = { id, report, fileIndex: indexFiles(report.files, report.previewFiles), createdAt: Date.now() };
  jobs.set(id, job);
  gcMemory();

  const drv = activeDriver();
  if (drv) {
    try {
      const payload = JSON.stringify(await serialize(report));
      await drv.put(`${BLOB_PREFIX}${id}.json`, payload, "application/json", TTL_MS / 1000);
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
      await drv.put(`${META_PREFIX}${id}.json`, JSON.stringify(meta), "application/json");
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
  const drv = activeDriver();
  if (!drv) return undefined;

  try {
    const buf = await drv.getBuffer(`${BLOB_PREFIX}${id}.json`);
    if (!buf) return undefined;
    const report = await deserialize(JSON.parse(buf.toString("utf8")) as SerializedBundle);
    const job: Job = { id, report, fileIndex: indexFiles(report.files, report.previewFiles), createdAt: Date.now() };
    jobs.set(id, job); // populate per-instance cache
    return job;
  } catch {
    return undefined;
  }
}

/**
 * getJob(), but if the job is missing from BOTH the in-memory cache and Blob
 * (evicted, or — as happened when the Blob free-tier transfer cap was hit —
 * Blob unavailable entirely), transparently re-runs the same conversion and
 * re-saves it under the same id, instead of surfacing "Job expired" for a
 * result the caller already generated once.
 *
 * This works independent of Blob's health because the lookup key (source URL
 * + which converter produced it) is durably recorded in Postgres by
 * recordConversion (lib/sites.ts) at conversion time — a completely separate
 * store from Blob, so a Blob outage can't take this fallback down with it.
 * Slower than a cache hit (a full reconversion), so only use this at the
 * three points a user can hit a stale job: preview, download, deploy.
 */
export async function getOrRegenerateJob(
  id: string,
  onProgress?: (msg: string) => void
): Promise<Job | undefined> {
  const existing = await getJob(id);
  if (existing) return existing;
  if (!dbConfigured()) return undefined;

  try {
    const site = await db.site.findFirst({ where: { themeRef: id } });
    if (!site?.framerUrl) return undefined;

    // Lazy imports: these pull in the full conversion pipelines (cheerio,
    // sharp, etc.), which every other store.ts caller (preview/download/
    // deploy on a cache hit — the overwhelmingly common case) has no reason
    // to load.
    const report =
      site.outputKind === "nextjs"
        ? await (await import("./nextjs-export")).convertToNextJs(site.framerUrl, onProgress)
        : await (await import("./convert")).convertSite(site.framerUrl, { mode: "hybrid" }, onProgress);

    return await saveJob(id, report);
  } catch (err) {
    console.error("[store] job regeneration failed:", err);
    return undefined;
  }
}

/** List recent conversions (newest first) for the admin dashboard. */
export async function listJobs(): Promise<JobMeta[]> {
  const drv = activeDriver();
  if (!drv) {
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
    const objects = await drv.list(META_PREFIX);
    const metas = await Promise.all(
      objects.map(async (o) => {
        try {
          const buf = await drv.getBuffer(o.pathname);
          return buf ? (JSON.parse(buf.toString("utf8")) as JobMeta) : null;
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

/** Delete a conversion (bundle + metadata) from memory and storage. */
export async function deleteJob(id: string): Promise<void> {
  jobs.delete(id);
  const drv = activeDriver();
  if (!drv) return;
  try {
    const [a, b] = await Promise.all([
      drv.list(`${BLOB_PREFIX}${id}.json`),
      drv.list(`${META_PREFIX}${id}.json`),
    ]);
    await drv.del([...a, ...b].map((x) => x.ref));
  } catch {
    /* non-fatal */
  }
}

export function normalize(p: string): string {
  return p.replace(/^\/+/, "").replace(/\/+$/, (m) => (m ? "" : m)) || "index.html";
}
