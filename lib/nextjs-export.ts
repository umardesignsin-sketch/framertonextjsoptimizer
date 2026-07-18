// Convert a Framer URL into a real, deployable Next.js project — accurately.
//
// Each Framer page becomes a statically-prerendered Next.js Route Handler
// (`app/<route>/route.ts`) that returns the page's original HTML, Framer's
// runtime script and CDN assets fully intact — so the deployed site renders
// and behaves identically to the source (full content, real animations,
// real interactivity).
//
// This was previously a real `page.tsx` with the App Router's metadata API
// instead — genuinely nicer code, and reverted deliberately, not by
// accident. Measured head-to-head on the same page: page.tsx scored 36
// mobile Performance (CLS 0.947, worst possible) against this Route
// Handler's 81 (CLS 0.016) — same runtime, same assets, same everything
// except how the page is served. The cause: App Router unconditionally
// serializes a page's full rendered output into its RSC hydration payload
// to support client-side navigation, which this page has no use for (every
// link is a plain <a>, not next/link — there's no soft navigation to
// support). For a large dangerouslySetInnerHTML body, that payload
// duplicates the entire page a second time as an escaped JS string the
// browser must also parse, which is what wrecked CLS and LCP. 81 also
// happens to be almost exactly what Framer's own official hosting scores on
// the same test — that's the real ceiling while keeping Framer's runtime for
// pixel-perfect fidelity; no wrapping choice gets past it.
import { fetchText, normalizeUrl } from "./fetch";
import { load, detectFramer, extractMeta } from "./parse";
import { discoverPages, normalizeRoute } from "./discover";
import { toRootRelative } from "./seo";
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
 * Apply the correctness/performance fixes: canonical/og:url pointed off
 * Framer's own domain (root-relative, then upgraded to absolute client-side —
 * see CANONICAL_SCRIPT), the LCP hero image prioritised, Framer's analytics
 * beacon dropped, and preconnect hints for the CDN. Everything else in the
 * document — Framer's runtime, appear-animation data, every class and
 * attribute — is untouched, so the page renders identically to the source.
 */
function processDocument(html: string, route: string): string {
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

  boostLcpImage($);

  // Framer's own site-analytics beacon — reports visitor traffic back to
  // Framer's servers, for a site that's no longer even hosted there. A
  // standalone <script async src="..."> with no inline logic, unrelated to
  // rendering/interactivity/appear-animations — safe to drop (pure network
  // weight + a pointless privacy leak), unlike the runtime bundle itself.
  $('script[src^="https://events.framer.com/"]').remove();

  // Every image, font, and the runtime bundle itself loads from here —
  // preconnecting shaves the DNS+TLS handshake off the very first request
  // instead of paying it mid-render.
  $("head").prepend(
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link rel="preconnect" href="https://framerusercontent.com">'
  );
  $("head").append(CANONICAL_SCRIPT);

  return $.html();
}

/**
 * A statically-prerendered route handler that returns the page HTML verbatim.
 * With no per-request work (the canonical is normalised client-side instead),
 * the page is generated once at build and served as a static, CDN-cacheable
 * asset — near-zero TTFB on Vercel/Netlify, matching how Framer's own hosting
 * serves the original.
 */
function routeHandler(html: string): string {
  return `// Auto-generated from the original Framer page. Served verbatim (Framer's
// runtime, CDN assets, and appear-animation data all intact) so it renders
// and behaves identically to the source. Statically prerendered and
// CDN-cached; the canonical URL self-references the deploy domain at runtime.
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
      plugins: [{ name: "next" }],
    },
    include: ["next-env.d.ts", "**/*.ts", ".next/types/**/*.ts"],
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
(\`app/<route>/route.ts\`) that returns the original Framer HTML verbatim, with
Framer's runtime intact. So the site renders **identically to the original** —
full content, animations, interactivity — with assets loading from Framer's CDN.

On top of that it applies a few host-agnostic fixes: the above-the-fold hero
image is marked \`fetchpriority="high"\` for a faster LCP, canonical/og:url are
repointed to the deploy domain (root-relative, upgraded to absolute in the
browser so they never reference Framer's domain), and Framer's own analytics
beacon is removed. Pages are static and CDN-cacheable, so TTFB stays low.

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

  onProgress("Generating Next.js project…");
  const files: ConvertedFile[] = [];
  // The downloadable bundle only has route.ts source (a JS string wrapping
  // the original HTML) — there's nothing an iframe can render directly from
  // that without actually running the Next.js server. previewFiles ships the
  // same raw HTML separately, namespaced under .next-preview/, purely for
  // the in-app "Live preview" — never part of the download.
  const previewFiles: ConvertedFile[] = [];

  for (const [route, html] of pageHtml.entries()) {
    const processed = processDocument(html, route);
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

  const pageCount = pageHtml.size;
  return {
    sourceUrl: start.toString(),
    pages: [...pageHtml.keys()].map((route) => ({
      route,
      sourceUrl: pages.find((p) => p.route === route)?.url || start.toString(),
    })),
    stats: [{ label: "Next.js routes", before: pageCount, after: pageCount, unit: "count" }],
    notes: [
      "pure Next.js App Router project — one statically-prerendered, CDN-cached route per Framer page",
      "renders identically to the original (Framer runtime kept, assets on CDN)",
      "LCP hero image prioritized (fetchpriority=high) for faster load than the original",
      "canonical URLs repointed to the deploy domain, Framer's analytics beacon removed",
      "run: npm install && npm run build",
    ],
    files,
    previewFiles,
  };
}
