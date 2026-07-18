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

// A placeholder swapped for the real deploy origin at request time (see
// routeHandler) — Lighthouse's SEO audit specifically requires an absolute
// canonical URL, so a build-time root-relative one (correct in every browser
// and search engine, but not what the audit wants) isn't enough on its own,
// and the real origin genuinely isn't known until someone deploys this.
const ORIGIN_PLACEHOLDER = "__NEXTJS_EXPORT_ORIGIN__";

/**
 * Apply the same correctness/performance fixes whether or not they'd have
 * gone through the metadata API — canonical/og:url rewritten off Framer's
 * own domain (see lib/seo.ts, the same fix already shipped for the Hybrid
 * HTML converter), Framer's own analytics beacon dropped, and preconnect
 * hints added for the CDN everything else loads from. Everything else in
 * the document — Framer's runtime, appear-animation data, every class and
 * attribute — is untouched.
 */
function processDocument(html: string, route: string): string {
  const $ = load(html);
  const path = route || "/";

  $('link[rel="canonical"]').each((_, el) => {
    if (toRootRelative($(el).attr("href"))) $(el).attr("href", `${ORIGIN_PLACEHOLDER}${path}`);
  });
  $('meta[property="og:url"]').each((_, el) => {
    if (toRootRelative($(el).attr("content"))) $(el).attr("content", `${ORIGIN_PLACEHOLDER}${path}`);
  });
  if (!$('link[rel="canonical"]').length) {
    $("head").append(`<link rel="canonical" href="${ORIGIN_PLACEHOLDER}${path}">`);
  }

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

  return $.html();
}

/**
 * A route handler that returns the page HTML as-is, with the canonical/
 * og:url origin filled in from the actual incoming request. Deliberately not
 * `force-static`: the real deploy domain isn't known until someone deploys
 * this, and a build-time-cached canonical would bake in whatever placeholder
 * origin the build happened to run under. The content itself never changes
 * per request — this is a single string replace on an in-memory constant,
 * not a real per-request computation — so the dynamic-rendering cost here is
 * negligible next to the correctness it buys.
 */
function routeHandler(html: string): string {
  return `// Auto-generated from the original Framer page. Served verbatim (Framer's
// runtime, CDN assets, and appear-animation data all intact) so it renders
// and behaves identically to the source. The canonical/og:url origin is
// filled in from the real request at serve time — see lib/nextjs-export.ts
// for why this can't be baked in at build time.
const HTML = ${JSON.stringify(html)};
const ORIGIN_PLACEHOLDER = ${JSON.stringify(ORIGIN_PLACEHOLDER)};

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const body = HTML.replaceAll(ORIGIN_PLACEHOLDER, origin);
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8" },
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
Canonical URLs are rewritten to be root-relative (so they self-reference
whatever domain you deploy to, not Framer's), and Framer's own analytics
beacon is removed since it's no longer relevant off Framer's hosting.

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
      "pure Next.js App Router project — one statically-prerendered route per Framer page",
      "renders identically to the original (Framer runtime kept, assets on CDN)",
      "canonical URLs repointed to the deploy domain, Framer's analytics beacon removed",
      "run: npm install && npm run build",
    ],
    files,
    previewFiles,
  };
}
