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
- [Framer to HTML](${SITE.url}/framer-to-html): Convert a published Framer site to a clean, fast static HTML bundle you can host anywhere.
- [Pure Next.js converter](${SITE.url}/nextjs): Export a Framer site as a real, deployable Next.js App Router project.
- [PageSpeed checker](${SITE.url}/speed): Compare Lighthouse scores before and after conversion.
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
