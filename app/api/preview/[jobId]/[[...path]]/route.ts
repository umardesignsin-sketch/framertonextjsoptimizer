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
  req: Request,
  { params }: { params: Promise<{ jobId: string; path?: string[] }> }
) {
  const { jobId, path } = await params;
  const canvas = new URL(req.url).searchParams.get("fnoCanvas") === "1";
  const job = await getJob(jobId);
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
      if (canvas) html = freezeForCanvas(html);
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
 * Freeze a page for the editor canvas (Framer-style design surface): strip
 * every script so the site's runtime never runs — no custom cursors, ripple
 * effects, hover JS, or hydration reverts — and pin CSS to a static state.
 * Safe for appear animations: their hidden start state is gated behind a
 * `.framer-anim` class that only a (now stripped) script adds, so every
 * element renders at its final visible state.
 */
function freezeForCanvas(html: string): string {
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const css =
    "<style data-fno-canvas>" +
    "*,*::before,*::after{animation:none!important;transition:none!important;cursor:default!important}" +
    "html,body{scroll-behavior:auto!important}" +
    "a,button,[role=button]{cursor:default!important}" +
    "video{pointer-events:none!important}" +
    // Appear/scroll-reveal elements are SSR'd at their hidden START state
    // (inline opacity:0.001 + transform) and revealed by the runtime we just
    // stripped. Park them at their visible resting state instead.
    "[data-framer-appear-id]{opacity:1!important;transform:none!important}" +
    "</style>";
  if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, css + "</head>");
  else out = css + out;
  return out;
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
