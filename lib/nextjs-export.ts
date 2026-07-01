// Convert a Framer URL into a real, deployable Next.js project.
//
// Unlike the hybrid converter (which outputs an optimized static HTML bundle),
// this emits an actual Next.js App Router project: one `app/<route>/page.tsx`
// per Framer page, rendering the page's markup, with the Framer design CSS
// inlined per page. Framer's JS runtime is stripped and appear-elements are
// revealed so the design renders statically. Assets load from Framer's CDN.
//
// Priority here is "it IS Next.js and deploys", not maximum Lighthouse.
import { fetchText, normalizeUrl } from "./fetch";
import { load, detectFramer, extractMeta, type Doc, type PageMeta } from "./parse";
import { discoverPages, normalizeRoute } from "./discover";
import { stripRuntime } from "./strip-js";
import type { ConvertReport, ConvertedFile } from "./types";

export type ProgressFn = (msg: string) => void;

/** Route path -> `app/.../page.tsx` file path. */
function pageFilePath(route: string): string {
  const r = normalizeRoute(route).replace(/^\/+/, "");
  return r ? `app/${r}/page.tsx` : "app/page.tsx";
}

/** Pull all <style> blocks (the Framer design CSS) and the <body> markup. */
function extractStylesAndBody($: Doc): { styles: string; body: string } {
  let styles = "";
  $("style").each((_, el) => {
    styles += ($.html(el) || "") + "\n";
  });
  const body = $("body").html() || "";
  return { styles, body };
}

function metadataLiteral(meta: PageMeta): string {
  const md: Record<string, unknown> = {};
  if (meta.title) md.title = meta.title;
  if (meta.description) md.description = meta.description;
  if (meta.ogTitle || meta.ogDescription || meta.ogImage) {
    md.openGraph = {
      ...(meta.ogTitle ? { title: meta.ogTitle } : {}),
      ...(meta.ogDescription ? { description: meta.ogDescription } : {}),
      ...(meta.ogImage ? { images: [meta.ogImage] } : {}),
    };
  }
  return JSON.stringify(md, null, 2);
}

function pageComponent(meta: PageMeta, styles: string, body: string): string {
  // Styles + body are injected as static HTML. Styles are placed before the
  // markup so the design renders. Server component → static (SSG).
  const html = styles + body;
  return `import type { Metadata } from "next";

export const metadata: Metadata = ${metadataLiteral(meta)};

export default function Page() {
  return <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />;
}
`;
}

function layoutTsx(meta: PageMeta): string {
  const lang = meta.lang || "en";
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(meta.title || "Site")},
  description: ${JSON.stringify(meta.description || "")},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang=${JSON.stringify(lang)}>
      <body>{children}</body>
    </html>
  );
}
`;
}

const GLOBALS_CSS = `html, body { margin: 0; padding: 0; }
* { box-sizing: border-box; }
`;

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
        "@types/react": "^18",
        "@types/react-dom": "^18",
        typescript: "^5",
      },
    },
    null,
    2
  );
}

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};
module.exports = nextConfig;
`;

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2021",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./*"] },
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

## Notes

- Each Framer page is an \`app/<route>/page.tsx\` rendering the page's markup;
  the Framer design CSS is inlined per page.
- Framer's JS runtime was stripped, so this renders the design statically
  (no Framer scroll/appear animations). Images/fonts load from Framer's CDN.
- Edit the components/markup as normal React. Deploy to Vercel, Netlify, etc.
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
  for (const [route, html] of pageHtml.entries()) {
    const $ = load(html);
    stripRuntime($, { hamburger: false }); // strip Framer JS + reveal content
    const meta = extractMeta($);
    const { styles, body } = extractStylesAndBody($);
    files.push({ path: pageFilePath(route), content: pageComponent(meta, styles, body) });
  }

  const host = (() => {
    try {
      return new URL(start.toString()).hostname.replace(/^www\./, "").replace(/\./g, "-");
    } catch {
      return "site";
    }
  })();

  files.push({ path: "app/layout.tsx", content: layoutTsx(siteMeta) });
  files.push({ path: "app/globals.css", content: GLOBALS_CSS });
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
      "pure Next.js App Router project — each Framer page is an app/ route",
      "Framer JS stripped (renders statically); assets load from Framer's CDN",
      "run: npm install && npm run build",
    ],
    files,
  };
}
