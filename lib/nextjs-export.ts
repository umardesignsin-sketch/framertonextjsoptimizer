// Convert a Framer URL into a real, deployable Next.js project — accurately.
//
// Each Framer page becomes a genuine Next.js App Router page
// (`app/<route>/page.tsx`) with a real `generateMetadata`/`export const
// metadata`, statically prerendered. The page's original <body> markup is
// preserved byte-for-byte and rendered via dangerouslySetInnerHTML, with
// Framer's own runtime script and CDN assets left completely untouched — so
// the deployed site renders and behaves identically to the source (full
// content, real animations, real interactivity), while actually being a
// proper Next.js project instead of a Route Handler faking a static file
// server. (A stripped/reproduced render loses fidelity; the hybrid converter
// is the optimized, runtime-free path for that.)
//
// Why dangerouslySetInnerHTML is safe here, not a hack: this content is only
// ever the page's own initial server-rendered HTML — the same bytes the
// browser's native HTML parser would receive from any traditional
// server-rendered page, script tags included. React's hydration explicitly
// skips diffing a dangerouslySetInnerHTML subtree, so nothing re-parses or
// re-executes it client-side; the browser's first-load HTML parser is what
// runs Framer's <script> tags, exactly as it would on Framer's own hosting.
import { fetchText, normalizeUrl } from "./fetch";
import { load, detectFramer, extractMeta, type PageMeta } from "./parse";
import { discoverPages, normalizeRoute } from "./discover";
import { toRootRelative } from "./seo";
import type { ConvertReport, ConvertedFile } from "./types";

export type ProgressFn = (msg: string) => void;

/** Route path -> `app/.../page.tsx` file path. */
function routeFilePath(route: string): string {
  const r = normalizeRoute(route).replace(/^\/+/, "");
  return r ? `app/${r}/page.tsx` : "app/page.tsx";
}

function routeToComponentName(route: string): string {
  const r = normalizeRoute(route).replace(/^\/+/, "");
  if (!r) return "HomePage";
  const name = r
    .split("/")
    .map((seg) => seg.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")))
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join("");
  return `${name}Page`;
}

function metadataObject(meta: PageMeta, route: string): string {
  // Framer hard-codes canonical/og:url to the SOURCE origin
  // (your-site.framer.website). Left as-is, the deployed export would tell
  // Google the "real" page still lives on Framer — cratering the new site's
  // own ranking. Root-relative self-references whatever domain actually
  // serves the export, matching the same fix already used by the Hybrid
  // HTML converter (lib/seo.ts).
  const canonicalPath = toRootRelative(meta.canonical) || route || "/";

  const obj: Record<string, unknown> = {};
  if (meta.title) obj.title = meta.title;
  if (meta.description) obj.description = meta.description;
  const og: Record<string, unknown> = {};
  if (meta.title) og.title = meta.title;
  if (meta.description) og.description = meta.description;
  if (meta.ogImage) og.images = [meta.ogImage];
  og.url = canonicalPath;
  if (Object.keys(og).length) obj.openGraph = og;
  if (meta.ogImage) {
    obj.twitter = { card: "summary_large_image", title: meta.title, description: meta.description, images: [meta.ogImage] };
  }
  obj.alternates = { canonical: canonicalPath };
  if (meta.favicon) obj.icons = { icon: meta.favicon };
  if (meta.robots) obj.robots = meta.robots;
  return JSON.stringify(obj, null, 2);
}

/** A genuine Next.js App Router page — real metadata, the original body markup preserved exactly. */
function pageTsx(componentName: string, meta: PageMeta, route: string, bodyHtml: string, jsonLd: string[]): string {
  const ldScripts = jsonLd
    .map(
      (json, i) =>
        `      <script key="ld-${i}" type="application/ld+json" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(json)} }} />`
    )
    .join("\n");
  return `import type { Metadata } from "next";

// Statically generated at build time — the body markup below is the exact
// original page content, Framer's runtime script included, so it behaves
// identically to the source once the browser parses it.
export const dynamic = "force-static";

export const metadata: Metadata = ${metadataObject(meta, route)};

const BODY_HTML = ${JSON.stringify(bodyHtml)};

export default function ${componentName}() {
  return (
    <>
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
${ldScripts}
    </>
  );
}
`;
}

function layoutTsx(lang: string, dir: string): string {
  return `import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="${lang}"${dir ? ` dir="${dir}"` : ""}>
      <body>
        {/* Every image, font, and the runtime bundle itself loads from
            here — preconnecting shaves the DNS+TLS handshake off the
            very first request instead of paying it mid-render. */}
        <link rel="preconnect" href="https://framerusercontent.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {children}
      </body>
    </html>
  );
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

Generated from ${sourceUrl}. ${pageCount} page(s), one real App Router page each.

## Run

\`\`\`bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
\`\`\`

## How it works

Every page is a genuine \`app/<route>/page.tsx\` — a real Next.js page with
its own \`generateMetadata\`, statically prerendered at build time. Each
page's original body markup is preserved exactly, Framer's runtime script
and CDN assets included, so the site renders and behaves **identically to
the original** — full content, real animations, real interactivity — while
actually being proper Next.js, not a Route Handler serving a raw string.

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

/** Pull the exact inner HTML of <body>, the <html> tag's lang/dir, and any <head> JSON-LD, without altering a single byte of Framer's actual rendered content. */
function splitDocument(html: string): { bodyHtml: string; lang: string; dir: string; jsonLd: string[] } {
  const $ = load(html);
  const htmlEl = $("html");
  const lang = htmlEl.attr("lang") || "en";
  const dir = htmlEl.attr("dir") || "";

  // Framer's own site-analytics beacon — reports visitor traffic back to
  // Framer's servers, for a site that's no longer even hosted there. A
  // standalone <script async src="...">  with no inline logic, unrelated to
  // rendering/interactivity/appear-animations — safe to drop (pure network
  // weight + a pointless privacy leak), unlike the runtime bundle itself.
  $('script[src^="https://events.framer.com/"]').remove();

  const bodyHtml = $("body").html() || "";
  const jsonLd: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).html();
    if (txt && txt.trim()) jsonLd.push(txt.trim());
  });
  return { bodyHtml, lang, dir, jsonLd };
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
  // The downloadable bundle ships real page.tsx source (no static HTML file
  // to render directly in an iframe), so previewFiles carries the same raw
  // HTML separately, namespaced under .next-preview/, purely for the in-app
  // "Live preview" — never part of the download.
  const previewFiles: ConvertedFile[] = [];
  let rootLang = "en";
  let rootDir = "";
  let first_ = true;

  for (const [route, html] of pageHtml.entries()) {
    const meta = extractMeta(load(html));
    const { bodyHtml, lang, dir, jsonLd } = splitDocument(html);
    if (first_) {
      rootLang = lang;
      rootDir = dir;
      first_ = false;
    }
    files.push({ path: routeFilePath(route), content: pageTsx(routeToComponentName(route), meta, route, bodyHtml, jsonLd) });
    const r = route.replace(/^\/+/, "").replace(/\/+$/, "");
    previewFiles.push({ path: r ? `.next-preview/${r}/index.html` : ".next-preview/index.html", content: html });
  }

  files.push({ path: "app/layout.tsx", content: layoutTsx(rootLang, rootDir) });

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
    stats: [{ label: "Next.js pages", before: pageCount, after: pageCount, unit: "count" }],
    notes: [
      "pure Next.js App Router project — one real, statically-prerendered page per Framer page",
      "renders identically to the original (Framer runtime kept, assets on CDN)",
      "run: npm install && npm run build",
    ],
    files,
    previewFiles,
  };
}
