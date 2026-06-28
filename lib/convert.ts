// Orchestrator: URL -> optimized static bundle (snapshot + optimize pipeline).
import { fetchText, fetchBinary, normalizeUrl } from "./fetch";
import { load, detectFramer, extractMeta, collectStyleText } from "./parse";
import { discoverPages, normalizeRoute } from "./discover";
import {
  collectImageUrls,
  isOptimizableImage,
  optimizeToWebp,
  copyAsset,
  rewriteImageRefs,
} from "./images";
import {
  collectFontUrls,
  fontLocalPath,
  ensureFontDisplaySwap,
  removeFontPreconnects,
} from "./fonts";
import { stripRuntime, removeTrackers } from "./strip-js";
import { restoreAppearAnimations } from "./appear";
import { removeStuckOverlays } from "./overlays";
import {
  fixVideos,
  collectVideoUrls,
  videoLocalPath,
  rewriteVideoRefs,
} from "./video";
import { seoPass } from "./seo";
import { optimizeImageLoading } from "./loading";
import {
  ConvertOptions,
  ConvertReport,
  ConvertedFile,
  DEFAULT_OPTIONS,
  OptimizationStat,
} from "./types";

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

function routeToFilePath(route: string): string {
  const r = normalizeRoute(route);
  if (r === "/") return "index.html";
  return r.replace(/^\//, "") + "/index.html";
}

export type ProgressFn = (msg: string) => void;

export async function convertSite(
  inputUrl: string,
  options: Partial<ConvertOptions> = {},
  onProgress: ProgressFn = () => {}
): Promise<ConvertReport> {
  const opts: ConvertOptions = { ...DEFAULT_OPTIONS, ...options };

  // Hybrid: keep the Framer runtime (full fidelity) but optimize safe assets.
  // Force-disable the lossy transforms; keep image WebP optimization. Fonts and
  // video stay on Framer's CDN (self-hosting every weight/clip is the bloat that
  // makes the "optimized" build slower than the original).
  const isHybrid = opts.mode === "hybrid";
  if (isHybrid) {
    opts.stripJs = false;
    opts.restoreAnimations = false;
    opts.selfHostFonts = false;
  }

  const start = normalizeUrl(inputUrl);

  onProgress(`Fetching ${start.toString()}`);
  const first = await fetchText(start.toString());
  if (first.status >= 400) {
    throw new Error(`Source returned HTTP ${first.status}`);
  }
  const $first = load(first.text);
  const detection = detectFramer($first);
  if (!detection.isFramer) {
    throw new Error(
      "This does not look like a Framer-published site. Signals found: " +
        (detection.reasons.join(", ") || "none")
    );
  }
  const meta = extractMeta($first);

  onProgress("Discovering pages…");
  const pages = await discoverPages(
    first.url,
    first.text,
    meta.searchIndexUrl,
    opts.maxPages
  );
  onProgress(`Found ${pages.length} page(s)`);

  // Fetch all page HTML (the start page is reused).
  const pageHtml = new Map<string, string>();
  pageHtml.set(normalizeRoute(new URL(first.url).pathname), first.text);
  await mapLimit(pages, 5, async (p) => {
    if (pageHtml.has(p.route)) return;
    try {
      const r = await fetchText(p.url);
      if (r.status < 400) pageHtml.set(p.route, r.text);
    } catch {
      /* skip unreachable page */
    }
  });

  // ---- Mirror mode: pixel-perfect, keep everything as-is ----
  // No JS stripping, no asset rewriting, no transforms. The output is the
  // original Framer HTML verbatim, so the deployed copy runs Framer's own
  // runtime and loads assets from Framer's CDN — rendering identically.
  if (opts.mode === "mirror") {
    onProgress("Mirror mode: keeping Framer runtime and all assets as-is");
    const mirrorFiles: ConvertedFile[] = [...pageHtml.entries()].map(
      ([route, html]) => ({ path: routeToFilePath(route), content: html })
    );
    return {
      sourceUrl: start.toString(),
      pages: [...pageHtml.keys()].map((route) => ({
        route,
        sourceUrl: pages.find((p) => p.route === route)?.url || start.toString(),
      })),
      stats: [
        { label: "Pages mirrored", before: mirrorFiles.length, after: mirrorFiles.length, unit: "count" },
      ],
      notes: [
        "pixel-perfect mirror: kept Framer runtime + all assets as-is (no JS stripped, no transforms)",
        "assets load from Framer's CDN — deploy stays identical to the original",
      ],
      files: mirrorFiles,
    };
  }

  // ---- Collect every asset URL across all pages ----
  const imageUrls = new Set<string>();
  const fontUrls = new Set<string>();
  const videoUrls = new Set<string>();
  for (const html of pageHtml.values()) {
    const $ = load(html);
    const css = collectStyleText($);
    collectImageUrls($, css).forEach((u) => imageUrls.add(u));
    if (opts.selfHostFonts) collectFontUrls(css).forEach((u) => fontUrls.add(u));
    collectVideoUrls($).forEach((u) => videoUrls.add(u));
  }

  // ---- Download + optimize images ----
  const assetMap = new Map<string, string>(); // originalUrl -> localPath
  const assetFiles: ConvertedFile[] = [];
  const notesCarry: string[] = [];
  let imgBefore = 0;
  let imgAfter = 0;
  let imagesDone = 0;

  if (opts.optimizeImages) {
    const urls = [...imageUrls].slice(0, opts.maxImages);
    if (imageUrls.size > urls.length) {
      notesCarry.push(
        `image cap hit: optimized ${urls.length} of ${imageUrls.size} images`
      );
    }
    onProgress(`Optimizing ${urls.length} image(s)…`);
    await mapLimit(urls, 6, async (url) => {
      try {
        const bin = await fetchBinary(url);
        if (bin.status >= 400 || bin.buffer.length === 0) return;
        const result =
          isOptimizableImage(url) && !/image\/svg/i.test(bin.contentType)
            ? await optimizeToWebp(url, bin.buffer)
            : copyAsset(url, bin.buffer);
        if (!result) return;
        assetMap.set(url, result.localPath);
        assetFiles.push({ path: result.localPath.replace(/^\//, ""), binary: result.buffer });
        imgBefore += result.beforeBytes;
        imgAfter += result.afterBytes;
        imagesDone++;
      } catch {
        /* skip broken asset */
      }
    });
  }

  // ---- Download fonts ----
  let fontBytes = 0;
  if (opts.selfHostFonts) {
    const urls = [...fontUrls];
    onProgress(`Self-hosting ${urls.length} font file(s)…`);
    await mapLimit(urls, 6, async (url) => {
      try {
        const bin = await fetchBinary(url);
        if (bin.status >= 400 || bin.buffer.length === 0) return;
        const local = fontLocalPath(url);
        assetMap.set(url, local);
        assetFiles.push({ path: local.replace(/^\//, ""), binary: bin.buffer });
        fontBytes += bin.buffer.length;
      } catch {
        /* skip */
      }
    });
  }

  // ---- Self-host videos (under the size cap; larger stay on CDN) ----
  // Hybrid keeps video on Framer's CDN — self-hosting heavy clips is bloat.
  let videoBytes = 0;
  let videosHosted = 0;
  if (!isHybrid && videoUrls.size > 0) {
    const urls = [...videoUrls];
    onProgress(`Self-hosting ${urls.length} video(s)…`);
    await mapLimit(urls, 3, async (url) => {
      try {
        const bin = await fetchBinary(url);
        if (bin.status >= 400 || bin.buffer.length === 0) return;
        if (bin.buffer.length > opts.maxVideoBytes) {
          notesCarry.push(
            `kept 1 video on CDN (${(bin.buffer.length / 1e6).toFixed(1)} MB > cap)`
          );
          return;
        }
        const local = videoLocalPath(url);
        assetMap.set(url, local);
        assetFiles.push({ path: local.replace(/^\//, ""), binary: bin.buffer });
        videoBytes += bin.buffer.length;
        videosHosted++;
      } catch {
        /* keep on CDN */
      }
    });
  }

  // ---- Transform + serialize each page ----
  const htmlFiles: ConvertedFile[] = [];
  let totalScriptsRemoved = 0;
  let totalModulepreloads = 0;
  let runtimeBytes = 0;
  let totalRevealed = 0;
  let totalAnimated = 0;
  let totalOverlays = 0;
  let totalTrackers = 0;
  let altsAdded = 0;
  let badgeRemoved = false;
  const notes = new Set<string>();

  for (const [route, html] of pageHtml.entries()) {
    const $ = load(html);
    const pmeta = extractMeta($);

    // rewrite asset references (images + fonts) using the combined map
    rewriteImageRefs($, assetMap);
    rewriteVideoRefs($, assetMap);

    if (opts.selfHostFonts) {
      ensureFontDisplaySwap($);
      removeFontPreconnects($);
    }
    if (opts.optimizeImages) optimizeImageLoading($);

    if (opts.stripJs) {
      // Reconstruct appear/scroll animations BEFORE stripping the runtime
      // (it reads, then removes, Framer's framer/appear scripts).
      if (opts.restoreAnimations) {
        totalAnimated += restoreAppearAnimations($).animated;
      }
      const s = stripRuntime($, {
        hamburger: true,
        appearFix: !opts.restoreAnimations,
      });
      totalScriptsRemoved += s.scriptsRemoved;
      totalModulepreloads += s.modulepreloadsRemoved;
      runtimeBytes += s.bytesRemoved;
      totalRevealed += s.elementsRevealed;
      totalOverlays += removeStuckOverlays($);
      fixVideos($);
    } else if (isHybrid) {
      // Keep the Framer runtime; only strip render-blocking third-party trackers.
      totalTrackers += removeTrackers($);
    }

    const seo = seoPass($, pmeta, route);
    altsAdded += seo.altsAdded;
    badgeRemoved = badgeRemoved || seo.badgeRemoved;
    seo.notes.forEach((n) => notes.add(n));

    htmlFiles.push({ path: routeToFilePath(route), content: $.html() });
  }

  const stats: OptimizationStat[] = [];
  if (opts.optimizeImages) {
    stats.push({ label: "Image payload", before: imgBefore, after: imgAfter, unit: "bytes" });
    stats.push({ label: "Images self-hosted", before: imageUrls.size, after: imagesDone, unit: "count" });
  }
  if (opts.stripJs) {
    stats.push({ label: "Scripts removed", before: totalScriptsRemoved, after: 0, unit: "count" });
    stats.push({ label: "modulepreload links removed", before: totalModulepreloads, after: 0, unit: "count" });
    stats.push({ label: "JS/runtime markup removed", before: runtimeBytes, after: 0, unit: "bytes" });
    stats.push({ label: "Hidden elements revealed", before: totalRevealed, after: totalRevealed, unit: "count" });
    if (totalAnimated > 0) {
      stats.push({ label: "Animations restored (CSS)", before: totalAnimated, after: totalAnimated, unit: "count" });
      notesCarry.push(`restored ${totalAnimated} appear/scroll animation(s) as CSS`);
    }
    if (totalOverlays > 0) {
      stats.push({ label: "Stuck overlays removed", before: totalOverlays, after: 0, unit: "count" });
      notesCarry.push(`removed ${totalOverlays} stuck loader/intro overlay(s)`);
    }
  }
  if (isHybrid) {
    stats.push({ label: "Trackers removed", before: totalTrackers, after: 0, unit: "count" });
    notesCarry.push(
      "hybrid: kept Framer runtime (full fidelity); removed trackers, optimized images, fonts/video stay on CDN"
    );
  }
  if (opts.selfHostFonts) {
    stats.push({ label: "Fonts self-hosted", before: fontUrls.size, after: fontUrls.size, unit: "count" });
    stats.push({ label: "Font payload self-hosted", before: fontBytes, after: fontBytes, unit: "bytes" });
  }
  if (videosHosted > 0) {
    stats.push({ label: "Videos self-hosted", before: videosHosted, after: videosHosted, unit: "count" });
    stats.push({ label: "Video payload self-hosted", before: videoBytes, after: videoBytes, unit: "bytes" });
  }

  if (badgeRemoved) notes.add("removed Framer badge");
  if (altsAdded) notes.add(`added alt text to ${altsAdded} image(s)`);
  notesCarry.forEach((n) => notes.add(n));

  return {
    sourceUrl: start.toString(),
    pages: [...pageHtml.keys()].map((route) => ({
      route,
      sourceUrl: pages.find((p) => p.route === route)?.url || start.toString(),
    })),
    stats,
    notes: [...notes],
    files: [...htmlFiles, ...assetFiles],
  };
}
