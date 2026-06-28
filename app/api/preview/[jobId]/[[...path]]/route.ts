// GET /api/preview/{jobId}/{...path}
// Serves a converted bundle's files so the result can be previewed in an iframe.
import { getJob, normalize } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json",
  txt: "text/plain; charset=utf-8",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
};

function mimeFor(path: string): string {
  const ext = (path.split(".").pop() || "").toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string; path?: string[] }> }
) {
  const { jobId, path } = await params;
  const job = getJob(jobId);
  if (!job) {
    return new Response("Job expired or not found. Re-run the conversion.", {
      status: 404,
    });
  }

  let rel = (path || []).join("/");
  if (!rel || rel.endsWith("/")) rel += "index.html";
  let file = job.fileIndex.get(normalize(rel));
  // directory-style route -> index.html
  if (!file) file = job.fileIndex.get(normalize(rel + "/index.html"));
  if (!file && !rel.includes(".")) {
    file = job.fileIndex.get(normalize(rel + "/index.html"));
  }
  if (!file) {
    return new Response("Not found in bundle: " + rel, { status: 404 });
  }

  let bodyBytes: Uint8Array;
  if (file.binary) {
    bodyBytes = new Uint8Array(file.binary);
  } else {
    let html = file.content || "";
    if (file.path.endsWith(".html")) {
      html = rewriteForPreview(html, `/api/preview/${jobId}/`);
    }
    bodyBytes = new TextEncoder().encode(html);
  }
  return new Response(bodyBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mimeFor(file.path),
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Rewrite root-absolute references so the bundle previews correctly under a
 * subpath. A <base> tag fixes relative URLs; stripping the single leading slash
 * from same-origin href/src/srcset/url() makes them relative to that base.
 */
function rewriteForPreview(html: string, base: string): string {
  let out = html;
  // strip single leading slash from href/src (but not protocol-relative //)
  out = out.replace(/\b(href|src)="\/(?!\/)/g, '$1="');
  // srcset entries
  out = out.replace(/\bsrcset="([^"]*)"/g, (_m, val: string) => {
    const fixed = val.replace(/(^|,\s*)\/(?!\/)/g, "$1");
    return `srcset="${fixed}"`;
  });
  // css url(/...)
  out = out.replace(/url\(\s*\/(?!\/)/g, "url(");
  out = out.replace(/url\(\s*(['"])\/(?!\/)/g, "url($1");
  // inject <base> as the first thing in <head>
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}<base href="${base}">`);
  } else {
    out = `<base href="${base}">` + out;
  }
  return out;
}
