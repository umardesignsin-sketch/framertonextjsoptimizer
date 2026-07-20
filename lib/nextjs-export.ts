// Convert a Framer URL into a real, deployable Next.js project — accurately.
//
// Each Framer page becomes a statically-prerendered Next.js Route Handler
// (`app/<route>/route.ts`) that serves the page's processed HTML verbatim —
// Framer's runtime script, its React-hydration comment markers, and CDN
// assets fully intact — so the deployed site renders and behaves identically
// to the source (full content, real animations, real interactivity).
//
// The HTML is served as a string constant ON PURPOSE. Two prettier
// architectures were each tried and reverted with measured proof — see the
// routeHandler() doc comment below for both post-mortems (page.tsx: RSC
// payload duplication, 36 vs 81 mobile Perf; decomposed JSX: React cannot
// emit the HTML comment nodes Framer's hydration depends on, 94 -> 62).
import { fetchText, fetchBinary, normalizeUrl } from "./fetch";
import { load, detectFramer, extractMeta, collectStyleText } from "./parse";
import { discoverPages, normalizeRoute } from "./discover";
import { toRootRelative } from "./seo";
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
import { platformConfigFiles } from "./platform-config";
import type { ConvertReport, ConvertedFile } from "./types";

export type ProgressFn = (msg: string) => void;

/** Route path -> `app/.../route.ts` file path. */
function routeFilePath(route: string): string {
  const r = normalizeRoute(route).replace(/^\/+/, "");
  return r ? `app/${r}/route.ts` : "app/route.ts";
}

// A one-liner injected into <head> that upgrades the root-relative canonical
// (and og:url) to an absolute, self-referencing URL at load time. Lighthouse's
// SEO audit reads the *rendered* DOM, so this passes the "valid rel=canonical"
// check with a real absolute URL — without needing to know the deploy domain
// at build time or rendering the page dynamically per request. Replaces an
// earlier build-time placeholder that a host's static prerender left unfilled
// (canonical shipped as a literal "__NEXTJS_EXPORT_ORIGIN__", tanking SEO).
const CANONICAL_SCRIPT =
  '<script>(function(){try{var u=location.origin+location.pathname;' +
  "var c=document.querySelector('link[rel=\"canonical\"]');if(c)c.setAttribute('href',u);" +
  "var g=document.querySelector('meta[property=\"og:url\"]');if(g)g.setAttribute('content',u);" +
  "}catch(e){}})();</script>";

/**
 * Point the likely LCP image at high priority. Framer ships responsive
 * <img srcset> heroes but never hints priority, so the browser fetches the
 * above-the-fold hero at default priority and LCP suffers — the single
 * biggest performance lever on an image-led Framer page (and the exact check,
 * `fetchpriority=high should be applied`, that Lighthouse flags). The image is
 * already in the initial HTML, so it just needs prioritising, not preloading.
 * Framer renders one hero per responsive breakpoint (all sharing the same
 * image id); only the visible one is fetched, so hinting every variant is safe
 * and guarantees the one that actually paints gets the boost.
 */
function boostLcpImage($: ReturnType<typeof load>): void {
  const imgs = $("img").toArray();
  const hero = imgs.find((el) => {
    const $el = $(el);
    const w = parseInt($el.attr("width") || "0", 10);
    const ref = ($el.attr("src") || "") + (($el.attr("srcset") as string) || "");
    return /framerusercontent\.com\/images\//.test(ref) && w >= 400;
  });
  if (!hero) return;
  const ref = ($(hero).attr("src") || "") + (($(hero).attr("srcset") as string) || "");
  const m = ref.match(/framerusercontent\.com\/images\/([A-Za-z0-9]+)[.?]/);
  if (!m) return;
  const id = m[1];
  $("img").each((_, el) => {
    const $el = $(el);
    const s = ($el.attr("src") || "") + (($el.attr("srcset") as string) || "");
    if (s.includes(id)) {
      $el.attr("fetchpriority", "high");
      if ($el.attr("loading") === "lazy") $el.removeAttr("loading");
    }
  });
}

/**
 * A previous version of this function replaced video iframes with a
 * click-to-play facade (a placeholder div, real iframe rebuilt on click) to
 * dodge Lighthouse's bf-cache audit failure caused by the Vimeo/YouTube
 * player's own unload handler. Removed: verified in a real browser — on the
 * OLD architecture too, not something today's change caused — that Framer's
 * own runtime doesn't recognize the facade div where it expects its video
 * component's iframe, and silently reconstructs a live, eagerly-loaded
 * iframe in its place regardless. That meant real users never actually got
 * the deferred-load benefit; they paid for the facade's own script AND the
 * eagerly-loaded video, which is worse than doing nothing. `loading="lazy"`
 * on the iframe itself (applied to every iframe uniformly in
 * deferOffscreenMedia below) is the only thing that has actually been
 * verified to survive Framer's runtime, since it's an attribute on the real
 * iframe rather than a substitute element Framer doesn't recognize.
 */

/**
 * Framer's own markup sets no `loading` attribute at all — every image on
 * the page fetches eagerly, competing with the actual LCP image for
 * bandwidth on first load. Same fix already validated on the Hybrid path
 * (lib/loading.ts): everything except the hero (already marked
 * fetchpriority="high" by boostLcpImage, which must run first) gets
 * `loading="lazy"` + `decoding="async"`, so below-the-fold images don't
 * start downloading until the browser is actually about to need them.
 * Third-party video/map iframes get the same native lazy-load treatment —
 * defers that embed's whole cost (script, cookies, network) until it's
 * actually scrolled near, which is often never for a page view that never
 * reaches that section.
 */
function deferOffscreenMedia($: ReturnType<typeof load>): void {
  $("img").each((_, el) => {
    const $el = $(el);
    if ($el.attr("fetchpriority") === "high") return;
    if (!$el.attr("loading")) $el.attr("loading", "lazy");
    if (!$el.attr("decoding")) $el.attr("decoding", "async");
  });
  $("iframe").each((_, el) => {
    const $el = $(el);
    if (!$el.attr("loading")) $el.attr("loading", "lazy");
  });
}

/**
 * Framer never sets a `lang` attribute on `<html>`, which fails Lighthouse's
 * `html-has-lang` accessibility audit on every export regardless of source
 * site. There's no reliable per-site language signal in the document (no
 * og:locale, no content-language meta) — "en" is the same default assumption
 * most static-site generators make, and is trivially overridable by editing
 * the generated route's HTML if a site is in another language.
 */
function ensureHtmlLang($: ReturnType<typeof load>): void {
  if (!$("html").attr("lang")) $("html").attr("lang", "en");
}

/**
 * Video/map/audio embeds Framer renders as bare `<iframe src>` with no
 * `title` — fails `frame-title`. Screen readers announce an iframe by its
 * title or fall back to reading the raw src URL, so this is a real a11y gap,
 * not a fidelity trade-off; labelling it changes nothing visually.
 */
function ensureIframeTitles($: ReturnType<typeof load>): void {
  $("iframe").each((_, el) => {
    const $el = $(el);
    if ($el.attr("title")) return;
    const src = $el.attr("src") || "";
    let label = "Embedded content";
    if (/vimeo\.com|youtube\.com|youtu\.be|wistia\.com/i.test(src)) label = "Video player";
    else if (/spotify\.com|soundcloud\.com/i.test(src)) label = "Audio player";
    else if (/google\.com\/maps|maps\.google/i.test(src)) label = "Map";
    $el.attr("title", label);
  });
}

/**
 * Ensures exactly one `role="main"` landmark exists — fails `landmark-one-main`
 * otherwise. Framer wraps the entire page in a single `<div id="main">`
 * sibling to script/link/svg-defs tags (verified against the real markup),
 * so promoting that one div is safe and unambiguous; it's not touched at all
 * on sites that already have a main landmark.
 */
function ensureMainLandmark($: ReturnType<typeof load>): void {
  if ($('[role="main"], main').length > 0) return;
  const candidate = $("body > div#main");
  if (candidate.length === 1) candidate.attr("role", "main");
}

const KNOWN_LINK_HOSTS: [RegExp, string][] = [
  [/instagram\.com/i, "Instagram"],
  [/(twitter|x)\.com/i, "Twitter"],
  [/facebook\.com/i, "Facebook"],
  [/linkedin\.com/i, "LinkedIn"],
  [/youtube\.com|youtu\.be/i, "YouTube"],
  [/tiktok\.com/i, "TikTok"],
  [/github\.com/i, "GitHub"],
  [/behance\.net/i, "Behance"],
  [/dribbble\.com/i, "Dribbble"],
  [/pinterest\.com/i, "Pinterest"],
];

/**
 * Framer commonly renders a logo/home link and social icons as an anchor
 * wrapping an `aria-hidden` decorative SVG with no visible text — correct for
 * the icon itself, but it leaves the *link* with no accessible name at all,
 * failing `link-name`. Infers a label from context (home-link patterns, known
 * social hosts, mailto/tel) rather than guessing blindly; links that already
 * have visible text, an aria-label, or an alt'd image are left untouched.
 */
function fixUnlabeledLinks($: ReturnType<typeof load>): void {
  $("a").each((_, el) => {
    const $el = $(el);
    const hasVisibleText = ($el.text() || "").trim().length > 0;
    const hasLabel = $el.attr("aria-label") || $el.attr("aria-labelledby") || $el.attr("title");
    const hasImgAlt =
      $el.find("img[alt]").filter((_, im) => ($(im).attr("alt") || "").trim() !== "").length > 0;
    if (hasVisibleText || hasLabel || hasImgAlt) return;

    const href = ($el.attr("href") || "").trim();
    const innerHtml = $el.html() || "";
    let label = "";
    if (/^(\.?\/?#home|\.?\/?)$/i.test(href) || /data-framer-name="Logo"/i.test(innerHtml)) {
      label = "Home";
    } else if (href.startsWith("mailto:")) {
      label = "Email";
    } else if (href.startsWith("tel:")) {
      label = "Phone";
    } else {
      const known = KNOWN_LINK_HOSTS.find(([re]) => re.test(href));
      if (known) label = known[1];
    }
    if (label) $el.attr("aria-label", label);
  });
}

/**
 * Apply the correctness/performance/accessibility fixes: canonical/og:url
 * pointed off Framer's own domain (root-relative, then upgraded to absolute
 * client-side — see CANONICAL_SCRIPT), the LCP hero image prioritised, every
 * other image/iframe deferred until needed, Framer's analytics beacon
 * dropped, preconnect hints for the CDN, and a handful of accessibility gaps
 * Framer's own export always has (missing `lang`, iframe titles, a main
 * landmark, unlabeled icon-only links). Everything else in the document — Framer's runtime,
 * appear-animation data, every class and attribute, and all visual styling —
 * is untouched, so the page renders identically to the source.
 */
function processDocument(html: string, route: string, assetMap: Map<string, string>): string {
  const $ = load(html);
  const path = route || "/";

  $('link[rel="canonical"]').each((_, el) => {
    if (toRootRelative($(el).attr("href"))) $(el).attr("href", path);
  });
  $('meta[property="og:url"]').each((_, el) => {
    if (toRootRelative($(el).attr("content"))) $(el).attr("content", path);
  });
  if (!$('link[rel="canonical"]').length) {
    $("head").append(`<link rel="canonical" href="${path}">`);
  }

  // Mark the hero BEFORE rewriting refs — boostLcpImage matches on the
  // framerusercontent URL, which rewriteImageRefs is about to replace with a
  // local /assets path. The fetchpriority attribute persists through the
  // rewrite.
  boostLcpImage($);
  deferOffscreenMedia($);
  if (assetMap.size) rewriteImageRefs($, assetMap);

  // Force font-display:swap on whatever @font-face rules remain (their
  // src: url() was just rewritten to local paths above, sharing assetMap
  // with images — rewriteImageRefs already handles CSS url() rewriting
  // generically) and drop Framer's own Google Fonts preconnect/stylesheet
  // links, which are dead weight once the actual font files are self-hosted.
  ensureFontDisplaySwap($);
  removeFontPreconnects($);

  ensureHtmlLang($);
  ensureIframeTitles($);
  ensureMainLandmark($);
  fixUnlabeledLinks($);

  // Framer's own site-analytics beacon — reports visitor traffic back to
  // Framer's servers, for a site that's no longer even hosted there. A
  // standalone <script async src="..."> with no inline logic, unrelated to
  // rendering/interactivity/appear-animations — safe to drop (pure network
  // weight + a pointless privacy leak), unlike the runtime bundle itself.
  $('script[src^="https://events.framer.com/"]').remove();

  // The runtime bundle itself still loads from Framer's CDN (images and
  // fonts are now self-hosted) — preconnecting shaves the DNS+TLS handshake
  // off the very first request instead of paying it mid-render.
  $("head").prepend('<link rel="preconnect" href="https://framerusercontent.com">');
  $("head").append(CANONICAL_SCRIPT);

  return $.html();
}

/**
 * A statically-prerendered route handler that serves the processed page HTML
 * verbatim, as a string constant. Two architectures that LOOK nicer were
 * tried and reverted, both with measured proof, and this doc comment is the
 * tombstone for both so they don't get re-attempted:
 *
 * 1. A real `page.tsx`: App Router unconditionally duplicates a page's
 *    entire rendered content into a hidden RSC hydration payload to support
 *    client-side navigation this page has no use for (every link is a plain
 *    <a>, not next/link). Measured head-to-head: 36 vs 81 mobile Performance
 *    (CLS 0.947 vs 0.016), same everything else.
 *
 * 2. Decomposed JSX (a Document.tsx of real elements, rendered to this
 *    string by ReactDOMServer in a prebuild step): structurally perfect —
 *    zero element/attribute/text mismatches across two real sites — but
 *    React cannot render HTML comment nodes, and Framer's SSR HTML carries
 *    its React hydration markers as comments (153 <!--$-->/<!--/$--> Suspense
 *    boundary pairs on a measured page, 320 comments total). Without them,
 *    Framer's runtime can't adopt the server DOM, falls back to a client
 *    re-render, and the appear-animation reveal (often the LCP element)
 *    lands ~2s later: 94 -> 62 mobile Performance measured under identical
 *    local serving conditions. Not fixable from JSX — there is no JSX syntax
 *    that emits a comment node — so "every element as editable JSX" and
 *    "Framer's runtime hydrates instantly" are mutually exclusive, and this
 *    export keeps the byte-exact HTML (comments included) instead.
 *
 * With no per-request work (the canonical is normalised client-side instead),
 * the page is generated once at build and served as a static, CDN-cacheable
 * asset — near-zero TTFB on Vercel/Netlify, matching how Framer's own
 * hosting serves the original.
 */
function routeHandler(html: string): string {
  return `// Auto-generated from the original Framer page. Served verbatim — including
// the HTML comment nodes, which are Framer's React hydration (Suspense
// boundary) markers: rendering this through JSX instead was tried and
// reverted because React cannot emit comment nodes, and losing them forces
// Framer's runtime into a slow client-side re-render (measured 94 -> 62
// mobile Performance). See routeHandler() in lib/nextjs-export.ts.
export const dynamic = "force-static";

const HTML = ${JSON.stringify(html)};

export function GET() {
  return new Response(HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400",
      "netlify-cdn-cache-control": "public, durable, max-age=31536000, stale-while-revalidate=86400",
    },
  });
}
`;
}

function packageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: "0.1.0",
      private: true,
      scripts: { dev: "next dev", build: "next build", start: "next start" },
      dependencies: { next: "14.2.35", react: "^18.3.1", "react-dom": "^18.3.1" },
      devDependencies: {
        "@types/node": "^20",
        "@types/react": "^18.3.1",
        "@types/react-dom": "^18.3.1",
        typescript: "^5",
      },
    },
    null,
    2
  );
}

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
module.exports = nextConfig;
`;

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2021",
      lib: ["dom", "dom.iterable", "esnext"],
      module: "esnext",
      moduleResolution: "bundler",
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      isolatedModules: true,
      incremental: true,
      jsx: "preserve",
      plugins: [{ name: "next" }],
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  },
  null,
  2
);

const GITIGNORE = `/node_modules
/.next/
/out/
.env*.local
next-env.d.ts
*.tsbuildinfo
`;

function readme(sourceUrl: string, pageCount: number): string {
  return `# Next.js project (converted from Framer)

Generated from ${sourceUrl}. ${pageCount} page(s), one App Router route each.

## Run

\`\`\`bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
\`\`\`

## How it works

Each page is a statically-prerendered Next.js **route handler**
(\`app/<route>/route.ts\`) serving the page HTML verbatim — including the HTML
comment markers Framer's runtime uses to hydrate instantly (which is why the
markup is a string constant rather than JSX: React cannot emit comment nodes,
and dropping them forces a slow client-side re-render). Framer's runtime
stays fully intact, so the site renders **identically to the original** —
full content, animations, interactivity.

On top of that it applies a few fixes: site images are re-encoded to WebP and
self-hosted under \`public/assets/img\` (fidelity-safe, and the biggest payload
win on image-led sites), fonts are self-hosted under \`public/assets/fonts\`
with \`font-display: swap\` forced, the above-the-fold hero image is marked
\`fetchpriority="high"\` for a faster LCP, canonical/og:url are repointed to the
deploy domain (root-relative, upgraded to absolute in the browser so they never
reference Framer's domain), and Framer's analytics beacon is removed. Pages are
static and CDN-cacheable, so TTFB stays low.

Deploy to Vercel/Netlify like any Next.js app.
`;
}

/** Simple bounded-concurrency map. */
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

export async function convertToNextJs(
  inputUrl: string,
  onProgress: ProgressFn = () => {}
): Promise<ConvertReport> {
  const start = normalizeUrl(inputUrl);

  onProgress(`Fetching ${start.toString()}`);
  const first = await fetchText(start.toString());
  if (first.status >= 400) throw new Error(`Source returned HTTP ${first.status}`);
  const $first = load(first.text);
  const detection = detectFramer($first);
  if (!detection.isFramer) {
    throw new Error(
      "This does not look like a Framer-published site. Signals: " +
        (detection.reasons.join(", ") || "none")
    );
  }
  const siteMeta = extractMeta($first);

  onProgress("Discovering pages…");
  const pages = await discoverPages(first.url, first.text, siteMeta.searchIndexUrl, 20);
  onProgress(`Found ${pages.length} page(s)`);

  const pageHtml = new Map<string, string>();
  pageHtml.set(normalizeRoute(new URL(first.url).pathname), first.text);
  await mapLimit(pages, 5, async (p) => {
    if (pageHtml.has(p.route)) return;
    try {
      const r = await fetchText(p.url);
      if (r.status < 400) pageHtml.set(p.route, r.text);
    } catch {
      /* skip */
    }
  });

  // ---- Self-host + optimize images ----
  // Framer serves site images as under-compressed PNG/JPEG from its CDN — on
  // an image-led site that's the dominant payload (and the #1 thing capping
  // the perf score below the original). Re-encoding to WebP and self-hosting
  // is fidelity-safe (visually identical, unlike stripping the runtime) and
  // ships assets under public/ so Next serves them from the deploy's own CDN.
  const MAX_IMAGES = 300;
  const imageUrls = new Set<string>();
  const fontUrls = new Set<string>();
  for (const html of pageHtml.values()) {
    const $ = load(html);
    const css = collectStyleText($);
    collectImageUrls($, css).forEach((u) => imageUrls.add(u));
    collectFontUrls(css).forEach((u) => fontUrls.add(u));
  }
  const assetMap = new Map<string, string>(); // original URL -> /assets/img|fonts/<hash>.ext
  const assetFiles: ConvertedFile[] = [];
  let imgBefore = 0;
  let imgAfter = 0;
  let imagesHosted = 0;
  let fontsHosted = 0;
  const urls = [...imageUrls].slice(0, MAX_IMAGES);
  const capNote =
    imageUrls.size > urls.length ? `image cap hit: optimized ${urls.length} of ${imageUrls.size}` : null;
  if (urls.length) {
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
        // Next.js serves the public/ directory at the site root, so a file at
        // public/assets/img/x.webp is fetched as /assets/img/x.webp.
        assetFiles.push({ path: `public${result.localPath}`, binary: result.buffer });
        imgBefore += result.beforeBytes;
        imgAfter += result.afterBytes;
        imagesHosted++;
      } catch {
        /* skip broken asset — its <img> keeps the original CDN URL */
      }
    });
  }

  // ---- Self-host fonts ----
  // Framer inlines the @font-face rules themselves but leaves the actual
  // .woff2 files on fonts.gstatic.com/framerusercontent.com — self-hosting
  // removes that third-party connection entirely (on top of the preconnect
  // hint) and lets font-display:swap be forced so text never blocks on it.
  let fontBytes = 0;
  if (fontUrls.size) {
    onProgress(`Self-hosting ${fontUrls.size} font file(s)…`);
    await mapLimit([...fontUrls], 6, async (url) => {
      try {
        const bin = await fetchBinary(url);
        if (bin.status >= 400 || bin.buffer.length === 0) return;
        const local = fontLocalPath(url);
        assetMap.set(url, local);
        assetFiles.push({ path: `public${local}`, binary: bin.buffer });
        fontBytes += bin.buffer.length;
        fontsHosted++;
      } catch {
        /* skip — the @font-face rule keeps its original CDN url() */
      }
    });
  }

  onProgress("Generating Next.js project…");
  const files: ConvertedFile[] = [...assetFiles];
  // The downloadable bundle has route.ts source (a JS string wrapping the
  // original HTML) plus the self-hosted images under public/ — but nothing an
  // iframe can render directly without running the Next.js server. previewFiles
  // ships the same optimized HTML separately, namespaced under .next-preview/,
  // for the in-app "Live preview" (which resolves /assets/ against public/).
  const previewFiles: ConvertedFile[] = [];

  for (const [route, html] of pageHtml.entries()) {
    const processed = processDocument(html, route, assetMap);
    files.push({ path: routeFilePath(route), content: routeHandler(processed) });
    const r = route.replace(/^\/+/, "").replace(/\/+$/, "");
    previewFiles.push({ path: r ? `.next-preview/${r}/index.html` : ".next-preview/index.html", content: processed });
  }

  const host = (() => {
    try {
      return new URL(start.toString()).hostname.replace(/^www\./, "").replace(/\./g, "-");
    } catch {
      return "site";
    }
  })();

  files.push({ path: "package.json", content: packageJson(`${host}-nextjs`) });
  files.push({ path: "next.config.js", content: NEXT_CONFIG });
  files.push({ path: "tsconfig.json", content: TSCONFIG });
  files.push({ path: ".gitignore", content: GITIGNORE });
  files.push({ path: "README.md", content: readme(start.toString(), pageHtml.size) });
  // _headers / vercel.json: harmless alongside a real `next build`, but the
  // thing that actually gives the self-hosted images a long-lived
  // Cache-Control on the static (no-build) deploy path the in-app "Deploy"
  // button uses — was already shipped for the Hybrid export, never wired up
  // here.
  files.push(...platformConfigFiles());

  const pageCount = pageHtml.size;
  return {
    sourceUrl: start.toString(),
    pages: [...pageHtml.keys()].map((route) => ({
      route,
      sourceUrl: pages.find((p) => p.route === route)?.url || start.toString(),
    })),
    stats: [
      { label: "Next.js routes", before: pageCount, after: pageCount, unit: "count" },
      ...(imgBefore > 0
        ? [{ label: "Image payload", before: imgBefore, after: imgAfter, unit: "bytes" as const }]
        : []),
      ...(fontBytes > 0
        ? [{ label: "Font payload self-hosted", before: fontBytes, after: fontBytes, unit: "bytes" as const }]
        : []),
    ],
    notes: [
      "pure Next.js App Router project — one statically-prerendered, CDN-cached route per Framer page",
      "renders identically to the original (Framer runtime kept)",
      `images self-hosted & re-encoded to WebP under public/${imagesHosted ? ` (${imagesHosted} files)` : ""}`,
      "LCP hero image prioritized (fetchpriority=high); other images/embeds deferred (loading=lazy)",
      ...(fontsHosted
        ? [`fonts self-hosted (${fontsHosted} files), font-display:swap forced, Google Fonts preconnect removed`]
        : []),
      "canonical URLs repointed to the deploy domain, Framer's analytics beacon removed",
      "accessibility gaps fixed: html[lang], iframe titles, one main landmark, unlabeled icon links",
      ...(capNote ? [capNote] : []),
      "run: npm install && npm run build",
    ],
    files,
    previewFiles,
  };
}
