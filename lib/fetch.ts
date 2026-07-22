// Network layer: fetch Framer SSR HTML and binary assets with browser-like
// headers. Every outbound fetch of a caller-supplied URL goes through
// guardedFetch (lib/ssrf.ts), which refuses private/internal/cloud-metadata
// targets and re-validates each redirect hop.
import { guardedFetch, SsrfError } from "./ssrf";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export interface FetchTextResult {
  url: string;
  status: number;
  text: string;
  contentType: string;
}

export async function fetchText(url: string): Promise<FetchTextResult> {
  const { res, url: finalUrl } = await guardedFetch(url, {
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const text = await res.text();
  return {
    url: finalUrl,
    status: res.status,
    text,
    contentType: res.headers.get("content-type") || "",
  };
}

export interface FetchBinaryResult {
  url: string;
  status: number;
  buffer: Buffer;
  contentType: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBinaryOnce(url: string): Promise<FetchBinaryResult> {
  const { res, url: finalUrl } = await guardedFetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
  });
  const arrayBuf = await res.arrayBuffer();
  return {
    url: finalUrl,
    status: res.status,
    buffer: Buffer.from(arrayBuf),
    contentType: res.headers.get("content-type") || "",
  };
}

/**
 * Sites with 100-300+ images fetch that many assets from Framer's CDN per
 * conversion (6-way concurrent) — a real, observed failure mode: an
 * occasional transient network error or 429/5xx silently dropped an image,
 * which the caller then can't distinguish from a real 404, so it just keeps
 * the original CDN URL. Retries transient failures (network errors, 429,
 * 5xx) with a short backoff; a genuine 4xx (real 404/403) returns
 * immediately since retrying won't fix a resource that doesn't exist.
 */
export async function fetchBinary(url: string, retries = 2): Promise<FetchBinaryResult> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fetchBinaryOnce(url);
      const transientFailure = result.status === 429 || result.status >= 500;
      if (transientFailure && attempt < retries) {
        await delay(250 * (attempt + 1));
        continue;
      }
      return result;
    } catch (err) {
      lastErr = err;
      // A blocked (SSRF) host will never succeed — don't burn retries on it.
      if (err instanceof SsrfError) throw err;
      if (attempt < retries) {
        await delay(250 * (attempt + 1));
        continue;
      }
    }
  }
  throw lastErr;
}

/** Normalize a user-supplied URL into an absolute https origin + path. */
export function normalizeUrl(input: string): URL {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  const u = new URL(raw);
  u.protocol = "https:";
  u.hash = "";
  return u;
}
