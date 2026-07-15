// GET /llms.txt — a concise, machine-readable summary for AI answer engines
// (ChatGPT, Perplexity, Google AI Overviews, etc.). Follows the llmstxt.org
// convention: H1 + blockquote summary + linked sections + a short FAQ.
import { SITE, FAQ } from "@/lib/site-meta";

export const dynamic = "force-static";

export function GET() {
  const faq = FAQ.map((f) => `- **${f.q}** ${f.a}`).join("\n");

  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} (${SITE.url}) is a free web tool that converts a published Framer
site into a production-ready website. Paste a Framer URL and it captures the
server-rendered HTML, removes Framer's JavaScript runtime, self-hosts and
re-encodes images to WebP, inlines fonts, and runs an SEO pass — then returns
either an optimized static bundle (Hybrid) or a real Next.js App Router project
(Pure Next.js). It can deploy the result to Netlify or Vercel and includes a
visual editor to change text, links, and images and publish live.

## Key pages
- [Home / Hybrid converter](${SITE.url}/): Convert a Framer site to an optimized static bundle with maximum Lighthouse scores.
- [Framer to HTML Converter](${SITE.url}/framer-to-html): Free Framer to HTML converter — paste a published Framer URL, get a clean static HTML ZIP (runtime stripped, WebP, SEO pass). Primary tool for "export Framer to HTML".
- [How to export a Framer site](${SITE.url}/export-framer-site): Guide to exporting Framer when official export does not exist (HTML or Next.js).
- [Pure Next.js converter](${SITE.url}/nextjs): Export a Framer site as a real, deployable Next.js App Router project.
- [PageSpeed checker](${SITE.url}/speed): Compare Lighthouse scores before and after conversion.
- [Pricing](${SITE.url}/pricing): Free — converting, previewing, editing, and publishing all included; hosting uses your own free-tier account.
- [FramerToNextJS vs NoCodeXport](${SITE.url}/vs/nocodexport): Honest comparison of Framer export tools — HTML ZIP export vs a real Next.js project + optimization pipeline.
- [Self-host a Framer site](${SITE.url}/guides/self-host-framer): Guide to moving a Framer site off Framer hosting to Netlify, Vercel, or Cloudflare.
- [Remove the Made in Framer badge](${SITE.url}/guides/remove-made-in-framer-badge): The two legitimate ways to remove the badge, compared.
- [Blog](${SITE.url}/blog): Guides and updates on converting Framer sites to Next.js, performance, SEO, and deployment.

## What it does
- Converts Framer sites to Next.js or an optimized static bundle
- Removes the Framer runtime for faster loads and higher Lighthouse scores
- Self-hosts and converts images to WebP; inlines fonts
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
