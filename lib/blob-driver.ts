// Storage driver abstraction for the job store.
//
// Two backends, picked once from the environment:
//  - Cloudflare R2 (preferred when configured): S3-compatible, and crucially
//    ZERO egress fees — the Vercel Blob free tier's 10GB/month transfer cap
//    paused the store mid-month once, which broke previews/downloads until
//    the cycle reset. R2 makes that failure mode structurally impossible.
//    Configure with R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
//    + R2_BUCKET.
//  - Vercel Blob (fallback, current default): used when only
//    BLOB_READ_WRITE_TOKEN / BLOB_STORE_ID are present. Unchanged behavior.
//
// The interface is the minimal five operations lib/store.ts actually uses.
import type { S3Client } from "@aws-sdk/client-s3";

export interface StoredObject {
  pathname: string;
  uploadedAt: Date;
  /** Backend-specific deletion handle (URL for Vercel Blob, key for R2). */
  ref: string;
}

export interface BlobDriver {
  readonly name: "r2" | "vercel-blob";
  /** Does an object exist at this path? */
  head(path: string): Promise<boolean>;
  put(path: string, body: string | Buffer, contentType: string, cacheSeconds?: number): Promise<void>;
  /** Returns null when the object doesn't exist. */
  getBuffer(path: string): Promise<Buffer | null>;
  list(prefix: string): Promise<StoredObject[]>;
  del(refs: string[]): Promise<void>;
}

// ---------------------------------------------------------------- R2 (S3 API)

function r2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

// The AWS SDK is a heavy import — load it lazily on first use so cold starts
// on the Vercel-Blob path (and builds) never pay for it.
let s3ClientPromise: Promise<S3Client> | null = null;
function s3(): Promise<S3Client> {
  if (!s3ClientPromise) {
    s3ClientPromise = import("@aws-sdk/client-s3").then(
      ({ S3Client }) =>
        new S3Client({
          region: "auto",
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
          },
        })
    );
  }
  return s3ClientPromise;
}

const r2Driver: BlobDriver = {
  name: "r2",
  async head(path) {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      await (await s3()).send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: path }));
      return true;
    } catch {
      return false;
    }
  },
  async put(path, body, contentType, cacheSeconds) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: path,
        Body: body,
        ContentType: contentType,
        ...(cacheSeconds ? { CacheControl: `max-age=${cacheSeconds}` } : {}),
      })
    );
  },
  async getBuffer(path) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await (await s3()).send(
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: path })
      );
      if (!res.Body) return null;
      return Buffer.from(await res.Body.transformToByteArray());
    } catch {
      return null;
    }
  },
  async list(prefix) {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const out: StoredObject[] = [];
    let token: string | undefined;
    do {
      const res = await (await s3()).send(
        new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET,
          Prefix: prefix,
          ContinuationToken: token,
        })
      );
      for (const obj of res.Contents || []) {
        if (!obj.Key) continue;
        out.push({ pathname: obj.Key, uploadedAt: obj.LastModified || new Date(0), ref: obj.Key });
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return out;
  },
  async del(refs) {
    if (refs.length === 0) return;
    const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(
      new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET,
        Delete: { Objects: refs.map((Key) => ({ Key })), Quiet: true },
      })
    );
  },
};

// ------------------------------------------------------------- Vercel Blob

function vercelConfigured(): boolean {
  // @vercel/blob authenticates via EITHER an explicit BLOB_READ_WRITE_TOKEN OR
  // OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID) — the newer connected-store model.
  return !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

const vercelDriver: BlobDriver = {
  name: "vercel-blob",
  async head(path) {
    const { head } = await import("@vercel/blob");
    return !!(await head(path).catch(() => null));
  },
  async put(path, body, contentType, cacheSeconds) {
    const { put } = await import("@vercel/blob");
    await put(path, body, {
      access: "private",
      addRandomSuffix: false,
      contentType,
      ...(cacheSeconds ? { cacheControlMaxAge: cacheSeconds } : {}),
    });
  },
  async getBuffer(path) {
    const { get } = await import("@vercel/blob");
    try {
      const result = await get(path, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    } catch {
      return null;
    }
  },
  async list(prefix) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix });
    return blobs.map((b) => ({ pathname: b.pathname, uploadedAt: new Date(b.uploadedAt), ref: b.url }));
  },
  async del(refs) {
    if (refs.length === 0) return;
    const { del } = await import("@vercel/blob");
    await Promise.all(refs.map((r) => del(r).catch(() => {})));
  },
};

// --------------------------------------------------------------- selection

/** The active storage driver, or null when neither backend is configured
 *  (local dev without credentials — the store stays memory-only). */
export function activeDriver(): BlobDriver | null {
  if (r2Configured()) return r2Driver;
  if (vercelConfigured()) return vercelDriver;
  return null;
}
