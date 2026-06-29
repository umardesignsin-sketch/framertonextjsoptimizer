// Shared types for the Framer → static conversion pipeline.

export interface FetchedPage {
  /** The URL that was actually fetched (after redirects). */
  url: string;
  /** Route path relative to the site root, e.g. "/" or "/about". */
  route: string;
  /** Raw HTML as returned by the server (SSR output). */
  html: string;
  /** HTTP status of the fetch. */
  status: number;
}

export interface AssetRef {
  /** Original absolute URL of the asset. */
  originalUrl: string;
  /** Local path it will be written to in the bundle, e.g. "/assets/img/abc.webp". */
  localPath: string;
}

export interface OptimizationStat {
  label: string;
  before: number;
  after: number;
  unit: "bytes" | "count" | "ms";
}

export interface ConvertedFile {
  /** Path within the output bundle, e.g. "index.html" or "about/index.html". */
  path: string;
  /** UTF-8 text content, or null when binary is provided. */
  content?: string;
  /** Binary content for assets. */
  binary?: Buffer;
}

export interface ConvertReport {
  sourceUrl: string;
  pages: { route: string; sourceUrl: string }[];
  stats: OptimizationStat[];
  notes: string[];
  files: ConvertedFile[];
}

/**
 * "optimize" = strip Framer's runtime and rebuild for max Lighthouse (lossy).
 * "mirror"   = pixel-perfect: keep the Framer runtime and every asset reference
 *              as-is, applying no transforms. The deployed copy renders and
 *              behaves identically to the original (assets load from Framer's
 *              CDN). Use when fidelity matters more than the perf score.
 * "hybrid"   = keep the Framer runtime (full fidelity: images, effects, text,
 *              responsiveness all work natively) but strip bloat and optimize
 *              safe assets — remove third-party trackers, convert <img> to WebP,
 *              and leave fonts/video on Framer's CDN (no self-hosting bloat).
 *              Accurate AND meaningfully faster, without chasing a perfect score.
 */
export type ConvertMode = "optimize" | "mirror" | "hybrid";

/**
 * Opt-in mobile performance optimizations. All default false — when every flag
 * is false the conversion output is byte-identical to before these were added.
 * Applied as injected CSS (+ aggressive image encoding) scoped to mobile, so
 * desktop fidelity is untouched.
 */
export interface MobileOptimizations {
  /** Disable Framer motion animations below the mobile breakpoint. */
  removeAnimations: boolean;
  /** Remove character/word/reveal text-appear effects on mobile. */
  removeTextEffects: boolean;
  /** Remove viewport/IntersectionObserver scroll-triggered animations on mobile. */
  removeScrollAnimations: boolean;
  /** Respect prefers-reduced-motion and reduce heavy motion. */
  reduceMotion: boolean;
  /** Encode images more aggressively (lower-quality WebP, smaller payload). */
  aggressiveImages: boolean;
  /** Master switch: apply the most aggressive safe mobile optimizations. */
  prioritizeMobileScore: boolean;
}

export const NO_MOBILE_OPT: MobileOptimizations = {
  removeAnimations: false,
  removeTextEffects: false,
  removeScrollAnimations: false,
  reduceMotion: false,
  aggressiveImages: false,
  prioritizeMobileScore: false,
};

export interface ConvertOptions {
  /** Conversion strategy. See ConvertMode. */
  mode: ConvertMode;
  /** Strip Framer's JS runtime (biggest mobile-perf win, removes animations). */
  stripJs: boolean;
  /**
   * Re-create Framer's appear/scroll-reveal animations as a lightweight CSS +
   * IntersectionObserver layer after the runtime is stripped. Requires stripJs.
   */
  restoreAnimations: boolean;
  /** Self-host + WebP-optimize images. */
  optimizeImages: boolean;
  /** Self-host fonts and inline @font-face. */
  selfHostFonts: boolean;
  /** Max number of pages to crawl. */
  maxPages: number;
  /** Max number of distinct images to download/optimize (runaway guard). */
  maxImages: number;
  /** Self-host background/inline videos up to this size; larger stay on CDN. */
  maxVideoBytes: number;
  /** Opt-in mobile performance optimizations (all default off). */
  mobileOpt: MobileOptimizations;
}

export const DEFAULT_OPTIONS: ConvertOptions = {
  mode: "optimize",
  stripJs: true,
  restoreAnimations: true,
  optimizeImages: true,
  selfHostFonts: true,
  maxPages: 20,
  maxImages: 400,
  maxVideoBytes: 12_000_000,
  mobileOpt: { ...NO_MOBILE_OPT },
};
