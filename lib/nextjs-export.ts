// Convert a Framer URL into a real, deployable, 100% pure Next.js project —
// genuine React/JSX page components, no Framer runtime, no framerusercontent.com
// dependency, assets self-hosted under /public.
//
// Reuses the exact same battle-tested pipeline as the "optimize" HTML export
// (runtime stripped, images self-hosted + WebP, fonts self-hosted, appear/scroll
// animations rebuilt as CSS + IntersectionObserver) — the only difference is the
// final serialization step: instead of writing flat .html files, each page's
// already-cleaned markup is converted into a real `app/<route>/page.tsx`
// Server Component, with a small shared "use client" component reproducing the
// handful of vanilla-JS behaviors (scroll-reveal, mobile menu toggle) as React.
import { convertSite } from "./convert";
import { load, extractMeta, type PageMeta } from "./parse";
import { normalizeRoute } from "./discover";
import { extractSections, type ExtractedSection } from "./html-to-jsx";
import type { ConvertedFile, ConvertReport } from "./types";

export type ProgressFn = (msg: string) => void;

/** "index.html" | "about/index.html" -> "/" | "/about" (mirrors convert.ts's routeToFilePath). */
function filePathToRoute(path: string): string {
  if (path === "index.html") return "/";
  return "/" + path.replace(/\/index\.html$/, "");
}

function routeToPageDir(route: string): string {
  const r = normalizeRoute(route).replace(/^\/+/, "");
  return r ? `app/${r}` : "app";
}

/** Relative import path from `app/<route>/page.tsx` back to `app/_components`. */
function relativeComponentsPath(route: string): string {
  const depth = normalizeRoute(route).replace(/^\/+/, "").split("/").filter(Boolean).length;
  return depth === 0 ? "./_components" : "../".repeat(depth) + "_components";
}

function componentFileTsx(section: ExtractedSection): string {
  return `import type { CSSProperties } from "react";

export default function ${section.name}() {
  return ${section.jsx};
}
`;
}

function pageComponentName(route: string): string {
  const r = normalizeRoute(route).replace(/^\/+/, "").replace(/\/$/, "");
  if (!r) return "HomePage";
  const parts = r.split("/").filter(Boolean).map((seg) =>
    seg.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""))
  );
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("") + "Page";
}

// Framer editor/hydration bookkeeping — meaningful only to Framer's own
// runtime (route/breakpoint hydration data, in-editor selection/layout
// flags). Once the runtime is gone these are inert, so we drop them entirely
// rather than ship dead attributes in the output markup.
const DEAD_FRAMER_ATTRS = [
  "data-framer-hydrate-v2",
  "data-framer-generated-page",
  "data-framer-ssr-released-at",
  "data-framer-page-optimized-at",
  "data-layout-template",
  "data-selection",
  "data-border",
  "data-framer-component-type",
  "data-reset",
];
const DEAD_FRAMER_ATTR_SELECTOR = DEAD_FRAMER_ATTRS.map((a) => `[${a}]`).join(", ");

function metadataObject(meta: PageMeta, route: string): string {
  const r = normalizeRoute(route);
  const fields: string[] = [];
  if (meta.title) fields.push(`title: ${JSON.stringify(meta.title)}`);
  if (meta.description) fields.push(`description: ${JSON.stringify(meta.description)}`);
  fields.push(`alternates: { canonical: ${JSON.stringify(r)} }`);
  const og: string[] = [`type: "website"`, `url: ${JSON.stringify(r)}`];
  if (meta.ogTitle || meta.title) og.push(`title: ${JSON.stringify(meta.ogTitle || meta.title)}`);
  if (meta.ogDescription || meta.description)
    og.push(`description: ${JSON.stringify(meta.ogDescription || meta.description)}`);
  if (meta.ogImage) og.push(`images: [${JSON.stringify(meta.ogImage)}]`);
  fields.push(`openGraph: { ${og.join(", ")} }`);
  return `{\n  ${fields.join(",\n  ")},\n}`;
}

/** Pull every JSON-LD structured-data script's raw text out of a document. */
function collectJsonLd($: ReturnType<typeof load>): string[] {
  const out: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).html();
    if (txt && txt.trim()) out.push(txt);
  });
  return out;
}

const SITE_INTERACTIONS_TSX = `"use client";
// Reproduces the handful of vanilla-JS behaviors the Framer runtime used to
// provide (scroll-reveal animation trigger, mobile menu toggle) as a small
// React effect — no Framer runtime, no Framer CDN dependency.
import { useEffect } from "react";

export default function SiteInteractions() {
  useEffect(() => {
    document.documentElement.classList.add("framer-anim");

    // --- scroll-reveal (appear animations, driven by the CSS in globals.css) ---
    const els = Array.from(document.querySelectorAll("[data-framer-appear-id]"));
    if (els.length) {
      const show = (el: Element) => el.classList.add("framer-appeared");
      const showAll = () => els.forEach(show);
      const reduced =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!("IntersectionObserver" in window) || reduced) {
        showAll();
      } else {
        const io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                show(entry.target);
                io.unobserve(entry.target);
              }
            }
          },
          { threshold: 0, rootMargin: "0px 0px -8% 0px" }
        );
        els.forEach((el) => io.observe(el));

        let ticking = false;
        const sweep = () => {
          ticking = false;
          const vh = window.innerHeight || 0;
          let remaining = false;
          for (const el of els) {
            if (el.classList.contains("framer-appeared")) continue;
            if (el.getBoundingClientRect().top < vh) {
              show(el);
              io.unobserve(el);
            } else {
              remaining = true;
            }
          }
          if (!remaining) {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
          }
        };
        const onScroll = () => {
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(sweep);
          }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        if (document.readyState === "complete") setTimeout(sweep, 300);
        else window.addEventListener("load", () => setTimeout(sweep, 300));

        return () => {
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
        };
      }
    }
  }, []);

  useEffect(() => {
    // --- mobile menu toggle (best-effort match on common Framer nav naming) ---
    const vis = (el: Element | null, on: boolean) => {
      if (!el) return;
      const style = (el as HTMLElement).style;
      style.display = on ? "" : "none";
      style.opacity = on ? "1" : "";
      style.pointerEvents = on ? "auto" : "";
    };
    const match = (re: RegExp) =>
      Array.from(document.querySelectorAll("[data-framer-name]")).filter((n) =>
        re.test(n.getAttribute("data-framer-name") || "")
      );
    const triggers = match(/menu|hamburger|burger|nav.?(open|toggle|icon)/i);
    const overlays = match(/menu.?(overlay|open|panel)|nav.?(overlay|panel)|mobile.?menu|overlay/i);
    if (!triggers.length || !overlays.length) return;

    let open = false;
    const setAll = (on: boolean) => {
      overlays.forEach((o) => vis(o, on));
      open = on;
    };
    setAll(false);

    const onClick = (e: Event) => {
      e.preventDefault();
      setAll(!open);
    };
    triggers.forEach((t) => {
      (t as HTMLElement).style.cursor = "pointer";
      t.addEventListener("click", onClick);
    });
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAll(false);
    };
    document.addEventListener("keydown", onKeydown);

    return () => {
      triggers.forEach((t) => t.removeEventListener("click", onClick));
      document.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return null;
}
`;

function layoutTsx(siteTitle: string): string {
  return `import type { Metadata } from "next";
import "./globals.css";
import SiteInteractions from "./site-interactions";

export const metadata: Metadata = {
  title: ${JSON.stringify(siteTitle || "Site")},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteInteractions />
      </body>
    </html>
  );
}
`;
}

function pageTsx(
  componentName: string,
  route: string,
  meta: PageMeta,
  bodyJsx: string,
  jsonLd: string[],
  usedComponents: string[]
): string {
  const ldScripts = jsonLd
    .map(
      (json, i) =>
        `      <script key="ld-${i}" type="application/ld+json" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(json)} }} />`
    )
    .join("\n");
  const componentsBase = relativeComponentsPath(route);
  const componentImports = usedComponents
    .map((name) => `import ${name} from "${componentsBase}/${name}";`)
    .join("\n");
  return `import type { Metadata } from "next";
import type { CSSProperties } from "react";
${componentImports ? componentImports + "\n" : ""}
export const metadata: Metadata = ${metadataObject(meta, route)};

export default function ${componentName}() {
  return (
    <>
${bodyJsx ? "      " + bodyJsx : ""}
${ldScripts}
    </>
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

Generated from ${sourceUrl}. ${pageCount} page(s), each a real React Server Component.

## Run

\`\`\`bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
\`\`\`

## How it works

Every page is a genuine \`app/<route>/page.tsx\` React component — real JSX, not
a wrapped HTML string. Named sections (nav, hero, footer, etc. — taken from
Framer's own layer names) are split out into reusable components under
\`app/_components/\`, deduplicated so an identical section repeated across
pages (like a site-wide nav or footer) resolves to a single shared file
imported wherever it's used, instead of being duplicated per page.

There is no Framer runtime and no dependency on framerusercontent.com: images
and fonts are self-hosted under \`/public\`, and the handful of vanilla-JS
behaviors Framer's runtime used to provide (scroll-reveal animation, mobile
menu toggle) are reproduced as a small "use client" React component
(\`app/site-interactions.tsx\`).

Deploy to Vercel/Netlify like any Next.js app.
`;
}

export async function convertToNextJs(
  inputUrl: string,
  onProgress: ProgressFn = () => {}
): Promise<ConvertReport> {
  const report = await convertSite(inputUrl, { mode: "optimize" }, onProgress);

  onProgress("Converting pages into React components…");

  const htmlFiles = report.files.filter((f) => f.path.endsWith(".html") && f.content != null);
  const assetFiles = report.files.filter((f) => !f.path.endsWith(".html") && f.path !== "vercel.json" && f.path !== "_headers");

  const files: ConvertedFile[] = [];
  const globalCss = new Set<string>();
  let siteTitle = "";

  // Shared across every page so identical sections (the same nav/footer
  // repeated site-wide) dedupe into one reusable component instead of being
  // inlined separately on each page.
  const componentRegistry = new Map<string, ExtractedSection>();
  const usedComponentNames = new Map<string, string>();

  for (const hf of htmlFiles) {
    const html = hf.content as string;
    const $ = load(html);
    const meta = extractMeta($);
    if (!siteTitle && meta.title) siteTitle = meta.title;
    const route = filePathToRoute(hf.path);

    // Pull every <style> block into the shared global stylesheet (dedup exact
    // duplicates — Framer's boilerplate/reset CSS repeats byte-for-byte across
    // pages of the same site).
    $("style").each((_, el) => {
      const text = $(el).html();
      if (text && text.trim()) globalCss.add(text.trim());
    });

    const jsonLd = collectJsonLd($);

    // Strip everything that's now handled elsewhere: <style> (-> globals.css),
    // our own injected behavior scripts (-> site-interactions.tsx), and JSON-LD
    // (re-emitted explicitly below).
    $("style").remove();
    $('script[data-framer-optimizer]').remove();
    $('script[type="application/ld+json"]').remove();
    $("script:not([src])").each((_, el) => {
      // Any remaining inline script (post strip-js) is either dead weight or a
      // genuine custom embed we can't safely execute as JSX text — drop rather
      // than risk broken markup; the vanilla-JS equivalents are already covered
      // by site-interactions.tsx.
      $(el).remove();
    });

    // Drop dead Framer editor/hydration bookkeeping attributes — nothing
    // reads these once the runtime is gone (they existed only for Framer's
    // own hydration and in-editor selection). Keep data-framer-name and
    // data-framer-appear-id: site-interactions.tsx and globals.css still key
    // off those at runtime.
    $(DEAD_FRAMER_ATTR_SELECTOR).each((_, el) => {
      DEAD_FRAMER_ATTRS.forEach((a) => $(el).removeAttr(a));
    });

    const bodyChildren = $("body").get(0)?.children ?? [];
    const pageRefs = new Set<string>();
    const bodyJsx = extractSections($, bodyChildren, componentRegistry, usedComponentNames, pageRefs);

    const componentName = pageComponentName(route);
    const dir = routeToPageDir(route);
    files.push({
      path: `${dir}/page.tsx`,
      content: pageTsx(componentName, route, meta, bodyJsx, jsonLd, [...pageRefs]),
    });
  }

  files.push({ path: "app/layout.tsx", content: layoutTsx(siteTitle) });
  files.push({ path: "app/site-interactions.tsx", content: SITE_INTERACTIONS_TSX });
  files.push({ path: "app/globals.css", content: [...globalCss].join("\n\n") });

  for (const section of componentRegistry.values()) {
    files.push({ path: `app/_components/${section.name}.tsx`, content: componentFileTsx(section) });
  }

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

  return {
    sourceUrl: report.sourceUrl,
    pages: report.pages,
    stats: [{ label: "React page components", before: htmlFiles.length, after: htmlFiles.length, unit: "count" }, ...report.stats],
    notes: [
      "100% pure Next.js App Router project — every page is a real React/JSX Server Component",
      `split into ${componentRegistry.size} reusable component(s) under app/_components (deduplicated across pages)`,
      "no Framer runtime, no framerusercontent.com dependency — images/fonts self-hosted under /public",
      "run: npm install && npm run build",
      ...report.notes,
    ],
    files,
  };
}
