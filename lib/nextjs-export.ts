// Convert a Framer URL into a real, deployable, 100% pure Next.js project —
// genuine React/JSX page components, no Framer runtime, no framerusercontent.com
// dependency, assets self-hosted under /public.
//
// Reuses the exact same battle-tested pipeline as the "optimize" HTML export
// (runtime stripped, images self-hosted + WebP, fonts self-hosted) — the
// difference is the final serialization step: instead of writing flat .html
// files, each page's already-cleaned markup is converted into a real
// `app/<route>/page.tsx` Server Component, with a small shared "use client"
// component reproducing the mobile menu toggle as React.
//
// Appear/scroll-reveal animations are reproduced as real Framer Motion
// (motion.*) components using Framer's own authored animation values
// (initial/animate/transition — including real spring physics, not a CSS
// cubic-bezier approximation), extracted from each page's raw
// `framer/appear` script data before the runtime-stripping pass removes it.
// Hover, tap, parallax, scroll-linked transforms, sticky effects, and
// mouse-follow interactions are NOT reproduced: that data lives inside
// Framer's proprietary, minified runtime bundle, not in a parseable static
// format, so there's nothing reliable to extract them from — fabricating
// plausible-looking values for those would risk shipping motion that
// doesn't match the original at all, which is worse than omitting it.
import { convertSite } from "./convert";
import { load, extractMeta, type PageMeta } from "./parse";
import { normalizeRoute } from "./discover";
import { extractSections, type ExtractedSection } from "./html-to-jsx";
import { fetchBinary, fetchText } from "./fetch";
import { isOptimizableImage, optimizeToWebp, copyAsset } from "./images";
import { extractAppearMap, type MotionAppearSpec } from "./appear";
import type { ConvertedFile, ConvertReport } from "./types";

const MOTION_IMPORT = `import { motion } from "motion/react";\n`;

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
  // motion.* is a client component (whileInView needs an IntersectionObserver
  // in the browser) — without this directive, rendering it from a Server
  // Component page.tsx fails RSC bundling.
  return `${section.usesMotion ? '"use client";\n' + MOTION_IMPORT : ""}import type { CSSProperties } from "react";

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

// Framer editor/hydration bookkeeping that doesn't happen to be namespaced
// data-framer-* (caught separately, generically, below) — meaningful only to
// Framer's own runtime and in-editor selection. Inert once the runtime is
// gone, so dropped rather than shipped as dead attributes.
const DEAD_NON_NAMESPACED_ATTRS = ["data-layout-template", "data-selection", "data-border", "data-reset"];
const DEAD_NON_NAMESPACED_SELECTOR = DEAD_NON_NAMESPACED_ATTRS.map((a) => `[${a}]`).join(", ");
// Kept, renamed elsewhere: data-framer-name -> data-section-name,
// data-framer-appear-id -> data-anim-id.
const KEPT_FRAMER_ATTRS = new Set(["data-framer-name", "data-framer-appear-id"]);

function metadataObject(meta: PageMeta, route: string, ogImageLocal?: string): string {
  const r = normalizeRoute(route);
  const fields: string[] = [];
  if (meta.title) fields.push(`title: ${JSON.stringify(meta.title)}`);
  if (meta.description) fields.push(`description: ${JSON.stringify(meta.description)}`);
  fields.push(`alternates: { canonical: ${JSON.stringify(r)} }`);
  const og: string[] = [`type: "website"`, `url: ${JSON.stringify(r)}`];
  if (meta.ogTitle || meta.title) og.push(`title: ${JSON.stringify(meta.ogTitle || meta.title)}`);
  if (meta.ogDescription || meta.description)
    og.push(`description: ${JSON.stringify(meta.ogDescription || meta.description)}`);
  const ogImage = ogImageLocal || meta.ogImage;
  if (ogImage) og.push(`images: [${JSON.stringify(ogImage)}]`);
  fields.push(`openGraph: { ${og.join(", ")} }`);
  return `{\n  ${fields.join(",\n  ")},\n}`;
}

/** Fetch + self-host a single CDN image (og:image, a JSON-LD "image" field, etc). */
async function hostCdnImage(url: string): Promise<{ localPath: string; file: ConvertedFile } | null> {
  try {
    const bin = await fetchBinary(url);
    if (bin.status >= 400 || bin.buffer.length === 0) return null;
    const result =
      isOptimizableImage(url) && !/image\/svg/i.test(bin.contentType)
        ? await optimizeToWebp(url, bin.buffer)
        : copyAsset(url, bin.buffer);
    if (!result) return null;
    return {
      localPath: result.localPath,
      file: { path: result.localPath.replace(/^\//, ""), binary: result.buffer },
    };
  } catch {
    return null;
  }
}

/**
 * Self-host every framerusercontent.com URL still embedded as plain text in
 * `text` (JSON-LD structured data isn't touched by the DOM-based image
 * pipeline, since it's just a string, not <img>/<source>/CSS) and rewrite
 * them to their local paths. `cache` is shared across the whole export run
 * so a repeated URL (e.g. the same Organization logo on every page) is only
 * fetched once.
 */
async function localizeCdnUrls(
  text: string,
  cache: Map<string, string | null>,
  files: ConvertedFile[]
): Promise<string> {
  const urls = [...new Set(text.match(/https:\/\/framerusercontent\.com\/[^\s"\\]+/g) || [])];
  for (const url of urls) {
    if (cache.has(url)) continue;
    const hosted = await hostCdnImage(url);
    if (hosted) files.push(hosted.file);
    cache.set(url, hosted?.localPath ?? null);
  }
  let result = text;
  for (const url of urls) {
    const local = cache.get(url);
    if (local) result = result.split(url).join(local);
  }
  return result;
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
// Reproduces the one vanilla-JS behavior the Framer runtime used to provide
// that Framer Motion doesn't cover on its own (mobile menu toggle) as a
// small React effect — no Framer runtime, no Framer CDN dependency. Appear/
// scroll-reveal animations are handled per-element by Framer Motion
// (motion.* components with initial/whileInView, see app/_components/ and
// each page's page.tsx) using Framer's own authored animation values, not a
// runtime or a CSS approximation.
import { useEffect } from "react";

export default function SiteInteractions() {
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
      Array.from(document.querySelectorAll("[data-section-name]")).filter((n) =>
        re.test(n.getAttribute("data-section-name") || "")
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

  useEffect(() => {
    // --- last-resort visibility safety net ---
    // Framer Motion's whileInView (per-element, see app/_components/) is the
    // real animation and handles the vast majority of reveals correctly. This
    // is only a backstop for edge cases it can legitimately miss — e.g. an
    // element inside a position:sticky panel, where IntersectionObserver's
    // relationship with the pinned ancestor doesn't always fire the way a
    // plain scrolling element would. Never touches anything Motion already
    // revealed; only steps in if something is still stuck long after it
    // should plausibly have appeared.
    const sweep = () => {
      const vh = window.innerHeight || 0;
      document.querySelectorAll<HTMLElement>('[style*="opacity"]').forEach((el) => {
        const op = parseFloat(getComputedStyle(el).opacity);
        if (!(op < 0.05)) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < vh && rect.bottom > -vh) {
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      });
    };
    const t1 = setTimeout(sweep, 1800);
    const onScroll = () => sweep();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      clearTimeout(t1);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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
  usedComponents: string[],
  usesMotion: boolean,
  ogImageLocal?: string
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
  return `${usesMotion ? MOTION_IMPORT : ""}import type { Metadata } from "next";
import type { CSSProperties } from "react";
${componentImports ? componentImports + "\n" : ""}
export const metadata: Metadata = ${metadataObject(meta, route, ogImageLocal)};

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
      dependencies: { next: "14.2.35", react: "^18.3.1", "react-dom": "^18.3.1", motion: "^11.15.0" },
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
and fonts are self-hosted under \`/public\`. Appear/scroll-reveal animations
are real \`motion.*\` (Framer Motion) components using Framer's own authored
values — see \`initial\`/\`whileInView\`/\`transition\` on the animated elements
in \`app/_components/\` and each page. The mobile menu toggle is a small
"use client" React component (\`app/site-interactions.tsx\`).

Not reproduced: hover/tap effects, parallax, scroll-linked transforms, sticky
effects, and mouse-follow interactions. That data lives inside Framer's
proprietary runtime bundle, not in a parseable static format, so there's
nothing reliable to extract it from.

Deploy to Vercel/Netlify like any Next.js app.
`;
}

export async function convertToNextJs(
  inputUrl: string,
  onProgress: ProgressFn = () => {}
): Promise<ConvertReport> {
  // "100% local assets" is the whole point of this export mode, so — unlike
  // the HTML export's conservative default — don't cap how many images get
  // self-hosted; a capped run leaves the tail of a large site's <img> tags
  // pointing straight at framerusercontent.com.
  const report = await convertSite(inputUrl, { mode: "optimize", maxImages: 100_000 }, onProgress);

  onProgress("Converting pages into React components…");

  const htmlFiles = report.files.filter((f) => f.path.endsWith(".html") && f.content != null);
  const assetFiles = report.files.filter((f) => !f.path.endsWith(".html") && f.path !== "vercel.json" && f.path !== "_headers");

  // Preview-only: the exact same optimized, runtime-free static HTML per
  // route that the JSX below is derived from — captured before any of the
  // per-page mutations, so it renders identically to the shipped project's
  // actual DOM (including working appear/scroll-reveal). Namespaced under
  // .next-preview/ and returned separately from `files` so it never ends up
  // in the user's downloaded project.
  const previewFiles: ConvertedFile[] = htmlFiles.map((hf) => ({
    path: `.next-preview/${hf.path}`,
    content: hf.content,
  }));

  const files: ConvertedFile[] = [];
  const globalCss = new Set<string>();
  let siteTitle = "";

  // Shared across every page so identical sections (the same nav/footer
  // repeated site-wide) dedupe into one reusable component instead of being
  // inlined separately on each page.
  const componentRegistry = new Map<string, ExtractedSection>();
  const usedComponentNames = new Map<string, string>();
  // og:image / JSON-LD image fields are typically shared across most/all
  // pages — cache so a given CDN URL is only ever fetched once.
  const cdnImageCache = new Map<string, string | null>();

  // Framer's generated class names (framer-9PFEJ, breakpoint-hash classes
  // like hidden-sv03hi, etc.) are deliberately left untouched — pixel-perfect
  // rendering depends on every class selector still matching exactly what
  // Framer's CSS targets, and renaming thousands of them is exactly the kind
  // of change most likely to introduce a subtle visual regression for no
  // real benefit.

  // Fetch each page's RAW HTML (parallel, capped) purely to extract Framer's
  // real appear/scroll-reveal animation data — framer/appear scripts are
  // stripped by the runtime-removal pass inside convertSite, so that data
  // has to be pulled out separately, before stripping, from an unprocessed
  // copy. IDs are content hashes and effectively unique site-wide, so every
  // page's map merges into one.
  onProgress("Extracting animation data…");
  const motionMap = new Map<string, MotionAppearSpec>();
  {
    const pageUrls = [...new Set(report.pages.map((p) => p.sourceUrl))];
    let i = 0;
    await Promise.all(
      Array.from({ length: Math.min(5, pageUrls.length) }, async () => {
        while (i < pageUrls.length) {
          const url = pageUrls[i++];
          try {
            const r = await fetchText(url);
            if (r.status < 400) {
              for (const [id, spec] of extractAppearMap(load(r.text))) motionMap.set(id, spec);
            }
          } catch {
            /* best-effort — that page's animations just won't be reproduced */
          }
        }
      })
    );
  }

  onProgress("Converting pages into React components…");

  for (const hf of htmlFiles) {
    const html = hf.content as string;
    const $ = load(html);
    const meta = extractMeta($);
    if (!siteTitle && meta.title) siteTitle = meta.title;
    const route = filePathToRoute(hf.path);

    // Rename the section-name attribute our own runtime still relies on for
    // the mobile-menu heuristic. data-framer-appear-id is left as-is here —
    // it's used directly as the motionMap lookup key below and never
    // emitted in the output (see html-to-jsx.ts). Class names are left as
    // Framer generated them (see note above).
    $("[data-framer-name]").each((_, el) => {
      $(el).attr("data-section-name", $(el).attr("data-framer-name") || "");
      $(el).removeAttr("data-framer-name");
    });

    // Pull every <style> block into the shared global stylesheet (dedup exact
    // duplicates — Framer's boilerplate/reset CSS repeats byte-for-byte across
    // pages of the same site). Skip our own injected appear-animation CSS —
    // Framer Motion owns those elements' opacity/transform now; the old
    // !important-driven CSS would fight it for control of the same styles.
    $("style").each((_, el) => {
      if ($(el).attr("data-framer-optimizer") != null) return;
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
    // own hydration and in-editor selection). Generic data-framer-* sweep
    // catches every variant (hydrate-v2, generated-page, ssr-released-at,
    // component-type, and any other Framer emits) rather than an enumerated
    // list that inevitably misses one. data-section-name (renamed above) and
    // data-framer-appear-id (used as the motionMap lookup key below, then
    // dropped by html-to-jsx.ts — never emitted) survive untouched.
    if (DEAD_NON_NAMESPACED_SELECTOR) {
      $(DEAD_NON_NAMESPACED_SELECTOR).each((_, el) => {
        DEAD_NON_NAMESPACED_ATTRS.forEach((a) => $(el).removeAttr(a));
      });
    }
    $("*").each((_, el) => {
      const $el = $(el);
      for (const key of Object.keys($el.attr() || {})) {
        if (/^data-framer-/i.test(key) && !KEPT_FRAMER_ATTRS.has(key)) {
          $el.removeAttr(key);
        }
      }
    });

    const bodyChildren = $("body").get(0)?.children ?? [];
    const pageRefs = new Set<string>();
    const pageMotion = new Set<string>();
    const bodyJsx = extractSections($, bodyChildren, componentRegistry, usedComponentNames, pageRefs, motionMap, pageMotion);

    // Self-host og:image (not covered by the general image pipeline, which
    // only rewrites <img>/<source>/CSS url() references) so metadata doesn't
    // keep pointing at framerusercontent.com either.
    let ogImageLocal: string | undefined;
    if (meta.ogImage && /framerusercontent\.com/i.test(meta.ogImage)) {
      if (cdnImageCache.has(meta.ogImage)) {
        ogImageLocal = cdnImageCache.get(meta.ogImage) || undefined;
      } else {
        const hosted = await hostCdnImage(meta.ogImage);
        if (hosted) {
          files.push(hosted.file);
          ogImageLocal = hosted.localPath;
        }
        cdnImageCache.set(meta.ogImage, hosted?.localPath ?? null);
      }
    }
    // JSON-LD structured data isn't touched by the DOM image pipeline (it's
    // just a string) — self-host and rewrite any CDN image URLs in it too,
    // independent of og:image (JSON-LD "image" is often a different asset,
    // e.g. the Organization logo).
    const jsonLdLocal: string[] = [];
    for (const j of jsonLd) jsonLdLocal.push(await localizeCdnUrls(j, cdnImageCache, files));

    const componentName = pageComponentName(route);
    const dir = routeToPageDir(route);
    files.push({
      path: `${dir}/page.tsx`,
      content: pageTsx(componentName, route, meta, bodyJsx, jsonLdLocal, [...pageRefs], pageMotion.size > 0, ogImageLocal),
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
      `appear/scroll-reveal animations reproduced as real Framer Motion components (${motionMap.size} found), using Framer's own authored values`,
      "no Framer runtime, no framerusercontent.com dependency — images/fonts self-hosted under /public",
      "run: npm install && npm run build",
      ...report.notes,
    ],
    files,
    previewFiles,
  };
}
