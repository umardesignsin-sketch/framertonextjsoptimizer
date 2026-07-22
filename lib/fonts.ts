// Font self-hosting: download @font-face sources, rewrite url() to local files,
// force font-display:swap, and remove the Google Fonts preconnect waterfall.
import crypto from "node:crypto";
import type { Doc } from "./parse";

const FONT_URL =
  /https?:\/\/(?:framerusercontent\.com|fonts\.gstatic\.com)\/[^'")\s]+\.(?:woff2|woff|ttf|otf)/gi;

export function collectFontUrls(css: string): Set<string> {
  const out = new Set<string>();
  for (const m of css.matchAll(FONT_URL)) out.add(m[0]);
  return out;
}

export function fontLocalPath(url: string): string {
  const ext = (/\.([a-z0-9]+)(\?|$)/i.exec(url)?.[1] || "woff2").toLowerCase();
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
  return `/assets/fonts/${hash}.${ext}`;
}

/** Add font-display:swap to any @font-face block that lacks it. */
export function ensureFontDisplaySwap($: Doc): number {
  let patched = 0;
  $("style").each((_, el) => {
    const $el = $(el);
    const css = $el.html() || "";
    if (!css.includes("@font-face")) return;
    const next = css.replace(/@font-face\s*\{([^}]*)\}/gi, (whole, body) => {
      if (/font-display\s*:/i.test(body)) return whole;
      patched++;
      return `@font-face{${body.trim()};font-display:swap;}`;
    });
    if (next !== css) $el.html(next);
  });
  return patched;
}

/** Remove preconnect/preload/stylesheet links pointing at Google Fonts. */
export function removeFontPreconnects($: Doc): number {
  let removed = 0;
  $(
    'link[href*="fonts.gstatic.com"], link[href*="fonts.googleapis.com"]'
  ).each((_, el) => {
    $(el).remove();
    removed++;
  });
  return removed;
}
