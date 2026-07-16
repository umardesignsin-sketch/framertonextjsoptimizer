// Convert a Framer URL into a real, deployable Next.js project, prioritizing
// 100% visual/behavioral accuracy over "pure" JSX. Framer's own runtime
// renders every page, so animations, hover states, scroll-linked transforms,
// and interactions are pixel-identical to the source — not an approximation
// reproduced in our own code, which necessarily can't perfectly replicate
// every effect Framer's proprietary Motion-based engine can produce.
//
// Reuses the same "hybrid" pipeline as the Hybrid HTML export (runtime kept;
// trackers removed; images self-hosted + WebP) — each page becomes an
// `app/<route>/route.ts` Route Handler that serves that page's HTML
// verbatim. This is still a genuine, deployable Next.js App Router project
// (npm install && npm run build && npm start, deploys to Vercel/Netlify like
// any Next.js app) — the trade-off is that pages are Route Handlers, not
// React/JSX components, and Framer's runtime bundle + fonts still load from
// framerusercontent.com (self-hosting Framer's own versioned/hashed runtime
// bundle risks breaking it, since it may reference other CDN resources
// internally).
import { convertSite } from "./convert";
import { normalizeRoute } from "./discover";
import type { ConvertedFile, ConvertReport } from "./types";

export type ProgressFn = (msg: string) => void;

/** "index.html" | "about/index.html" -> "/" | "/about" (mirrors convert.ts's routeToFilePath). */
function filePathToRoute(path: string): string {
  if (path === "index.html") return "/";
  return "/" + path.replace(/\/index\.html$/, "");
}

/** Route path -> `app/.../route.ts` file path. */
function routeFilePath(route: string): string {
  const r = normalizeRoute(route).replace(/^\/+/, "");
  return r ? `app/${r}/route.ts` : "app/route.ts";
}

/** A statically-prerendered route handler that returns the page HTML as-is. */
function routeHandler(html: string): string {
  return `// Auto-generated from the original Framer page. Served verbatim so
// Framer's runtime + CDN assets render every animation and interaction
// exactly like the source.
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
(\`app/<route>/route.ts\`) that returns the original Framer page's HTML
verbatim, with Framer's runtime intact. The site renders and behaves
**identically to the original** — every animation, hover state, and
scroll-linked effect, because Framer's own runtime is what's driving them,
not a reimplementation. Images are self-hosted and optimized to WebP;
Framer's runtime bundle and fonts still load from framerusercontent.com
(self-hosting the runtime itself risks breaking it).

Deploy to Vercel/Netlify like any Next.js app.
`;
}

export async function convertToNextJs(
  inputUrl: string,
  onProgress: ProgressFn = () => {}
): Promise<ConvertReport> {
  const report = await convertSite(inputUrl, { mode: "hybrid" }, onProgress);

  onProgress("Generating Next.js project…");

  const htmlFiles = report.files.filter((f) => f.path.endsWith(".html") && f.content != null);
  const assetFiles = report.files.filter((f) => !f.path.endsWith(".html") && f.path !== "vercel.json" && f.path !== "_headers");

  const files: ConvertedFile[] = [];
  for (const hf of htmlFiles) {
    const route = filePathToRoute(hf.path);
    files.push({ path: routeFilePath(route), content: routeHandler(hf.content as string) });
  }

  // Preview-only copy under the same paths the download uses, kept separate
  // from `files` so the live preview/no-build deploy paths (which need
  // plain HTML, not a route handler) have something to serve without ending
  // up in the user's downloaded project.
  const previewFiles: ConvertedFile[] = htmlFiles.map((hf) => ({
    path: `.next-preview/${hf.path}`,
    content: hf.content,
  }));

  for (const af of assetFiles) {
    files.push({ path: `public/${af.path.replace(/^\/+/, "")}`, content: af.content, binary: af.binary });
  }

  const host = (() => {
    try {
      return new URL(report.sourceUrl).hostname.replace(/^www\./, "").replace(/\./g, "-");
    } catch {
      return "site";
    }
  })();

  files.push({ path: "package.json", content: packageJson(`${host}-nextjs`) });
  files.push({ path: "next.config.js", content: NEXT_CONFIG });
  files.push({ path: "tsconfig.json", content: TSCONFIG });
  files.push({ path: ".gitignore", content: GITIGNORE });
  files.push({ path: "README.md", content: readme(report.sourceUrl, htmlFiles.length) });

  const pageCount = htmlFiles.length;
  return {
    sourceUrl: report.sourceUrl,
    pages: report.pages,
    stats: [{ label: "Next.js routes", before: pageCount, after: pageCount, unit: "count" }, ...report.stats],
    notes: [
      "real, deployable Next.js App Router project — one statically-prerendered route per Framer page",
      "renders identically to the original — Framer's runtime is kept, so every animation/interaction is pixel-accurate",
      "images self-hosted + optimized to WebP; Framer's runtime bundle and fonts stay on framerusercontent.com",
      "run: npm install && npm run build",
      ...report.notes,
    ],
    files,
    previewFiles,
  };
}
