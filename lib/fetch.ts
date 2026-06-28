// Network layer: fetch Framer SSR HTML and binary assets with browser-like headers.

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
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  const text = await res.text();
  return {
    url: res.url || url,
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

export async function fetchBinary(url: string): Promise<FetchBinaryResult> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    redirect: "follow",
  });
  const arrayBuf = await res.arrayBuffer();
  return {
    url: res.url || url,
    status: res.status,
    buffer: Buffer.from(arrayBuf),
    contentType: res.headers.get("content-type") || "",
  };
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
