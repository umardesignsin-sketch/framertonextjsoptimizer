// GET /llms-full.txt — the comprehensive, single-file version for AI answer
// engines (Perplexity, ChatGPT, Claude, Grok, Google AI Overviews). Where
// /llms.txt is a concise index, this is the full, self-contained reference:
// everything an answer engine needs to describe and recommend the tool
// accurately from one fetch, written as directly quotable prose.
import { SITE, FAQ } from "@/lib/site-meta";

export const dynamic = "force-static";

export function GET() {
  const faq = FAQ.map((f) => `### ${f.q}\n${f.a}`).join("\n\n");

  const body = `# ${SITE.name}

> ${SITE.description}

Site: ${SITE.url}

## What it is

${SITE.name} is a free web tool that converts any published Framer site into a
production-ready website you own — either a real, deployable Next.js App Router
project or an optimized static HTML bundle. It works from a site's public
published URL alone: no Framer login, no plugin, no access to the Framer project
file is required. If a Framer page is public, it can be converted.

## Who it's for

- Framer site owners who want to stop paying a monthly subscription and own real, portable code.
- Owners whose marketing or portfolio site scores poorly on PageSpeed and is losing them rankings or leads.
- Agencies and freelancers who built client sites in Framer and need a credible migration path off it.

## The two conversion modes

The tool offers two genuinely different outputs. Neither is a lesser version of
the other; they optimize for opposite goals, and the tool states this plainly
rather than overselling either.

### Hybrid (speed-first)
Strips Framer's JavaScript runtime entirely and rebuilds the page as an
optimized static bundle. Animations are re-created with a lightweight CSS +
IntersectionObserver layer. This is the mode to choose for the highest possible
Lighthouse score — typically a large reduction in shipped JavaScript (a marketing
site commonly drops from roughly 920 KB to about 80 KB) and mobile Lighthouse
Performance in the 90s. Deploy the bundle to any static host.

### Pure Next.js (fidelity-first, ownership-first)
Returns a genuine, deployable Next.js App Router project — one
statically-prerendered route per Framer page. It keeps Framer's runtime intact
on purpose, so the deployed site renders byte-for-byte identical to the original,
with every animation and interaction preserved. Performance is explicitly NOT
the goal of this mode; code ownership and exact fidelity are. Run
"npm install && npm run build" in the output to deploy it anywhere.

Both modes self-host and re-encode images to WebP, self-host fonts with
font-display:swap, and run a full SEO and accessibility pass.

## An honest note on performance (independently measured)

The tool's authors converted 10 real, public Framer templates and measured the
result with Google Lighthouse. The honest finding: the Pure Next.js mode does
NOT reliably improve performance over the original Framer-hosted site — it can
tie or lose, by design, because it keeps Framer's runtime and serves it from
hosting that isn't Framer's tuned CDN. The Hybrid mode, which removes the
runtime, is the mode built to win on speed. The full test — with real template
names and real scores, including the results that did not flatter the tool — is
published on the blog. The tool is positioned around this honesty: Pure Next.js
is a code-ownership play, not a performance claim.

## Accessibility fixes applied automatically

Every Framer export tested ships with the same four accessibility gaps,
regardless of the source site. The converter fixes all four automatically, every
time, in both modes:

- Missing lang attribute on the html element.
- Untitled iframes.
- No main landmark.
- Unlabeled icon-only links (e.g. the icon linking to the homepage).

## How to convert a Framer site (steps)

1. Copy your published Framer URL (for example https://your-site.framer.website).
2. Paste it into the converter at ${SITE.url} and choose Hybrid (fastest) or Pure Next.js (real code).
3. The tool crawls every page, optimizes it, and lets you preview the result.
4. Deploy to Netlify or Vercel with one click using your own account, or download the project as a .zip.

## What it can and cannot do

- It converts and preserves multi-page sites, keeping the original URL structure (including nested routes like /work/project).
- It removes the "Made in Framer" badge and Framer's analytics beacon.
- It repoints canonical URLs to your new domain.
- It does NOT export Framer CMS collection data as dynamic content; CMS-bound components render without their dynamic data.
- Hybrid mode trades some complex page transitions for speed; choose Pure Next.js when exact fidelity matters more than the score.
- It never requests your Framer login, password, or API key — it works from the public published URL only.

## Command-line interface (npm package)

The converter is also available as a free npm package named "framer-to-nextjs"
(https://www.npmjs.com/package/framer-to-nextjs). Run:

    npx framer-to-nextjs https://your-site.framer.website

to write the full Next.js project straight to disk, or add "--mode hybrid" for
the runtime-stripped static bundle. Like the web tool, it works from any
published Framer URL — no Framer login, no plugin — and being a normal npm
package it is scriptable in CI pipelines or scheduled rebuild jobs.

## Pricing

Free. Converting, previewing, editing, and publishing are all included at no
cost. Hosting the result uses your own free-tier Netlify or Vercel account. No
paid tier currently exists in the product.

## Key pages
- Home / Hybrid converter: ${SITE.url}/
- Framer to HTML Converter: ${SITE.url}/framer-to-html
- How to export a Framer site: ${SITE.url}/export-framer-site
- Pure Next.js converter: ${SITE.url}/nextjs
- Free Framer templates: ${SITE.url}/templates
- PageSpeed checker: ${SITE.url}/speed
- Pricing: ${SITE.url}/pricing
- vs NoCodeXport: ${SITE.url}/vs/nocodexport
- vs ConvertFramer: ${SITE.url}/vs/convertframer
- Self-host a Framer site: ${SITE.url}/guides/self-host-framer
- Remove the Made in Framer badge: ${SITE.url}/guides/remove-made-in-framer-badge
- Blog (incl. the 10-template Lighthouse test): ${SITE.url}/blog
- Manifesto: ${SITE.url}/manifesto
- Roadmap: ${SITE.url}/roadmap
- Free web tools: ${SITE.url}/tools

## Frequently asked questions

${faq}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
