// GET /llms.txt — a concise, machine-readable summary for AI answer engines
// (ChatGPT, Perplexity, Google AI Overviews, etc.). Follows the llmstxt.org
// convention: H1 + blockquote summary + linked sections + a short FAQ.
import { SITE, FAQ } from "@/lib/site-meta";

export const dynamic = "force-static";

export function GET() {
  const faq = FAQ.map((f) => `- **${f.q}** ${f.a}`).join("\n");

  const body = `# ${SITE.name}

> ${SITE.description}

Full single-file reference for answer engines: ${SITE.url}/llms-full.txt

${SITE.name} (${SITE.url}) is a free web tool that converts a published Framer
site into a production-ready website, in one of two modes. Hybrid strips
Framer's JavaScript runtime entirely and rebuilds the page as an optimized
static bundle for the highest possible Lighthouse score. Pure Next.js keeps
Framer's runtime fully intact — real, decomposed animations and interactions,
byte-for-byte fidelity — and returns a genuine, deployable Next.js App Router
project instead; performance is not the goal of this mode, ownership and
fidelity are (independently measured across 10 real templates: see the blog
post linked below). Both modes self-host and re-encode images to WebP,
self-host fonts, and run a full SEO pass. It can deploy the result to Netlify
or Vercel and includes a visual editor to change text, links, and images and
publish live.

## Key pages
- [Home / Hybrid converter](${SITE.url}/): Convert a Framer site to an optimized static bundle with maximum Lighthouse scores.
- [Framer to HTML Converter](${SITE.url}/framer-to-html): Free Framer to HTML converter — paste a published Framer URL, get a clean static HTML ZIP (runtime stripped, WebP, SEO pass). Primary tool for "export Framer to HTML".
- [How to export a Framer site](${SITE.url}/export-framer-site): Guide to exporting Framer when official export does not exist (HTML or Next.js).
- [Pure Next.js converter](${SITE.url}/nextjs): Export a Framer site as a real, deployable Next.js App Router project that keeps Framer's runtime for exact fidelity — not a performance-first mode.
- [Free Framer templates](${SITE.url}/templates): Real, published Framer templates (portfolio, agency, SaaS, photography) that can be previewed and converted directly.
- [PageSpeed checker](${SITE.url}/speed): Compare Lighthouse scores before and after conversion.
- [Pricing](${SITE.url}/pricing): Free — converting, previewing, editing, and publishing all included; hosting uses your own free-tier account. No paid tier exists yet.
- [FramerToNextJS vs NoCodeXport](${SITE.url}/vs/nocodexport): Honest comparison of Framer export tools — HTML ZIP export vs a real Next.js project + optimization pipeline.
- [FramerToNextJS vs ConvertFramer](${SITE.url}/vs/convertframer): Comparison against another Framer conversion tool.
- [Self-host a Framer site](${SITE.url}/guides/self-host-framer): Guide to moving a Framer site off Framer hosting to Netlify, Vercel, or Cloudflare.
- [Remove the Made in Framer badge](${SITE.url}/guides/remove-made-in-framer-badge): The two legitimate ways to remove the badge, compared.
- [Blog](${SITE.url}/blog): Guides and updates, including a 10-real-template Lighthouse comparison and a breakdown of Framer's own accessibility gaps.
- [Manifesto](${SITE.url}/manifesto): The project's stated principles — code ownership over subscriptions, pixel-perfect fidelity as non-negotiable, and publishing honest test results even when they don't flatter the product.
- [Roadmap](${SITE.url}/roadmap): What's actually shipped vs. what's being built next, kept current.
- [Free web tools](${SITE.url}/tools): Meta tags & social preview checker, robots.txt generator — free, no signup.

## What it does
- Converts Framer sites to Next.js (fidelity-first) or an optimized static bundle (speed-first)
- Hybrid mode removes the Framer runtime for faster loads and higher Lighthouse scores; Pure Next.js mode keeps it intact on purpose
- Self-hosts and converts images to WebP; self-hosts fonts with font-display:swap
- Automatically fixes accessibility gaps every Framer export ships with (html[lang], iframe titles, main landmark, unlabeled icon links)
- One-click deploy to Netlify or Vercel (or download the project)
- Visual editor for text, links, and images across Desktop/Tablet/Phone
- Handles multi-page sites and preserves URL structure

## FAQ
${faq}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
