// Convert a Framer URL into a real, deployable Next.js project — accurately.
//
// Each Framer page becomes a statically-prerendered Next.js Route Handler
// (`app/<route>/route.ts`) that returns the page's ORIGINAL HTML verbatim,
// Framer runtime intact. So the deployed Next.js site renders identically to
// the original — full content, animations, interactivity — because Framer's own
// runtime + CDN assets do the work. (A stripped/static render loses animations
// and hides appear-animated content; the hybrid converter is the optimized path.)
import { fetchText, normalizeUrl } from "./fetch";
import { load, detectFramer, extractMeta } from "./parse";
import { discoverPages, normalizeRoute } from "./discover";
import type { ConvertReport, ConvertedFile } from "./types";

export type ProgressFn = (msg: string) => void;

/** Route path -> `app/.../route.ts` file path. */
function routeFilePath(route: string): string {
  const r = normalizeRoute(route).replace(/^\/+/, "");
  return r ? `app/${r}/route.ts` : "app/route.ts";
}

/** A statically-prerendered route handler that returns the page HTML as-is. */
function routeHandler(html: string): string {
  return `// Auto-generated from the original Framer page. Served verbatim so the
// Framer runtime + CDN assets render it identically to the source.
export const dynamic = "force-static";

const HTML = ${JSON.stringify(html)};

export function GET() {
  return new Response(HTML, {
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
  for (const [route, html] of pageHtml.entries()) {
    files.push({ path: routeFilePath(route), content: routeHandler(html) });
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
      "run: npm install && npm run build",
    ],
    files,
  };
}
