// Image self-hosting + WebP optimization.
// Collects every framerusercontent.com image reference (src, srcset, CSS url()),
// re-encodes rasters to WebP with sharp, and rewrites all references to /assets.
import sharp from "sharp";
import crypto from "node:crypto";
import type { Doc } from "./parse";

const IMG_HOST = /framerusercontent\.com/i;
const RASTER_EXT = /\.(png|jpe?g|webp|avif)(\?|$)/i;
const MAX_WIDTH = 1920;

export interface OptimizedImage {
  localPath: string; // e.g. /assets/img/abc123.webp
  buffer: Buffer;
  beforeBytes: number;
  afterBytes: number;
}

function hashName(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
}

/** Pull every optimizable image URL out of the document + collected CSS text. */
export function collectImageUrls($: Doc, cssText: string): Set<string> {
  const urls = new Set<string>();
  const add = (u?: string | null) => {
    if (!u) return;
    const trimmed = u.trim();
    if (IMG_HOST.test(trimmed)) urls.add(trimmed);
  };

  $("img").each((_, el) => {
    add($(el).attr("src"));
    parseSrcset($(el).attr("srcset")).forEach(add);
  });
  $("source").each((_, el) => {
    parseSrcset($(el).attr("srcset")).forEach(add);
    add($(el).attr("src"));
  });
  // inline style background-image
  $("[style]").each((_, el) => {
    extractCssUrls($(el).attr("style") || "").forEach(add);
  });
  // <link rel=preload as=image>
  $('link[as="image"]').each((_, el) => add($(el).attr("href")));
  // CSS text from <style> blocks
  extractCssUrls(cssText).forEach(add);

  return urls;
}

export function parseSrcset(srcset?: string | null): string[] {
  if (!srcset) return [];
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

export function extractCssUrls(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    out.push(m[1]);
  }
  return out;
}

export function isOptimizableImage(url: string): boolean {
  return IMG_HOST.test(url) && RASTER_EXT.test(url);
}

/** Re-encode a raster image to WebP, downscaling to MAX_WIDTH. Returns null on failure. */
export async function optimizeToWebp(
  url: string,
  buffer: Buffer,
  quality = 78
): Promise<OptimizedImage | null> {
  try {
    const img = sharp(buffer, { animated: true });
    const meta = await img.metadata();
    let pipeline = img;
    if (meta.width && meta.width > MAX_WIDTH) {
      pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    }
    const out = await pipeline.webp({ quality, effort: 4 }).toBuffer();
    return {
      localPath: `/assets/img/${hashName(url)}.webp`,
      buffer: out,
      beforeBytes: buffer.length,
      afterBytes: out.length,
    };
  } catch {
    return null;
  }
}

/** Non-raster (svg/gif) → copy as-is under /assets/img, preserving extension. */
export function copyAsset(url: string, buffer: Buffer): OptimizedImage {
  const ext = (/\.([a-z0-9]+)(\?|$)/i.exec(url)?.[1] || "bin").toLowerCase();
  return {
    localPath: `/assets/img/${hashName(url)}.${ext}`,
    buffer,
    beforeBytes: buffer.length,
    afterBytes: buffer.length,
  };
}

/** Rewrite every image reference in the document using url -> localPath map. */
export function rewriteImageRefs($: Doc, map: Map<string, string>): void {
  const remap = (u?: string | null): string | null => {
    if (!u) return null;
    const local = map.get(u.trim());
    return local || null;
  };

  $("img").each((_, el) => {
    const $el = $(el);
    const newSrc = remap($el.attr("src"));
    if (newSrc) $el.attr("src", newSrc);
    const srcset = $el.attr("srcset");
    if (srcset) $el.attr("srcset", rewriteSrcset(srcset, map));
  });

  $("source").each((_, el) => {
    const $el = $(el);
    const srcset = $el.attr("srcset");
    if (srcset) $el.attr("srcset", rewriteSrcset(srcset, map));
    const newSrc = remap($el.attr("src"));
    if (newSrc) $el.attr("src", newSrc);
  });

  $("[style]").each((_, el) => {
    const $el = $(el);
    const style = $el.attr("style") || "";
    const next = rewriteCssUrls(style, map);
    if (next !== style) $el.attr("style", next);
  });

  $('link[as="image"]').each((_, el) => {
    const newHref = remap($(el).attr("href"));
    if (newHref) $(el).attr("href", newHref);
  });

  // Rewrite url() inside every <style> block.
  $("style").each((_, el) => {
    const $el = $(el);
    const css = $el.html() || "";
    const next = rewriteCssUrls(css, map);
    if (next !== css) $el.html(next);
  });
}

export function rewriteSrcset(srcset: string, map: Map<string, string>): string {
  return srcset
    .split(",")
    .map((part) => {
      const seg = part.trim();
      const [url, ...descr] = seg.split(/\s+/);
      const local = map.get(url.trim());
      return local ? [local, ...descr].join(" ") : seg;
    })
    .join(", ");
}

export function rewriteCssUrls(css: string, map: Map<string, string>): string {
  return css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (whole, url) => {
    const local = map.get(String(url).trim());
    return local ? `url(${local})` : whole;
  });
}
