import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Next.js SEO: A Practical Checklist for the App Router",
    excerpt: "Most Next.js SEO advice is written for the Pages Router. Here's what actually changed with App Router — the metadata API, sitemaps, JSON-LD, and one App Router–specific mistake that tanks Core Web Vitals if you don't know to avoid it.",
    tags: ["nextjs", "seo", "app router", "technical"],
    content: `Most "Next.js SEO" guides still floating around were written for the Pages Router and never got updated. App Router changed several of the mechanics — some for the better, one in a way that can quietly wreck your Lighthouse score if you don't know about it. This is the checklist as it actually works today.

## Use the Metadata API, not manual \`<head>\` tags

App Router replaced hand-written \`<Head>\` components with a typed \`Metadata\` export (or \`generateMetadata\` for dynamic routes):

\`\`\`ts
export const metadata: Metadata = {
  title: "Page title",
  description: "...",
  alternates: { canonical: "/page" },
  openGraph: { type: "website", title: "...", description: "..." },
};
\`\`\`

The real win isn't convenience, it's inheritance: metadata defined in a layout applies to every page under it, and a page-level export only overrides the specific fields it sets. Get the shared fields (site name, default OG image, robots policy) right once in the root layout, and every page below inherits them without repeating boilerplate.

## Generate your sitemap and robots.txt as code, not static files

\`app/sitemap.ts\` and \`app/robots.ts\` export functions instead of static XML/text — which matters the moment your site has any dynamic content (a CMS, a database-backed blog). A static \`sitemap.xml\` goes stale the day you publish a new page without redeploying; a \`sitemap.ts\` that queries your database on each request (with a \`revalidate\` window so it isn't hit on every crawl) never does.

## Structured data (JSON-LD) belongs in the page, not a third-party tag manager

Inject JSON-LD directly with a script tag inside the component:

\`\`\`tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
\`\`\`

Doing it server-side (rather than injecting via a client-side tag manager) means the structured data is present in the initial HTML response — crawlers that don't execute JavaScript still see it, which a client-injected version can't guarantee.

## The App Router–specific mistake: serving large pre-rendered HTML through a \`page.tsx\`

This is the one that isn't in older SEO checklists because it didn't exist before App Router. If a page's actual content is a large chunk of pre-rendered HTML — migrated content, scraped output, anything in that shape — App Router's own hydration mechanism embeds a serialized copy of that page's rendered content into the initial response, so the client-side router can do instant soft navigation. For a normal component tree that payload is negligible. For a page that's mostly a large HTML blob, it means shipping the entire page twice: once as real HTML, once again as escaped JSON.

We hit this directly building this site's own converter: the exact same page, same assets, served two ways —

| | \`page.tsx\` | Route Handler (\`route.ts\`) |
|---|---|---|
| Mobile Performance | 36 | **81** |
| Cumulative Layout Shift | 0.947 | **0.016** |

A Route Handler never enters the page/hydration pipeline, so the duplication disappears entirely. If a route's content is large, pre-rendered HTML and doesn't need client-side soft navigation (no \`next/link\` between those pages), serving it from \`route.ts\` instead of \`page.tsx\` sidesteps a real, silent performance and CLS hit that most Next.js SEO advice doesn't mention because it's specific to how App Router's hydration payload works.

## Canonical URLs, every time

Set \`alternates: { canonical: "..." }\` on every page, even ones without an obvious duplicate-content risk. Query-string variants, trailing-slash inconsistencies, and preview/staging domains all fragment ranking signal across what should be one indexed URL — an explicit canonical is cheap insurance against all of them.

## The practical order to fix things in

1. Root layout metadata (title template, default OG, robots policy) — one place, inherited everywhere.
2. \`sitemap.ts\` / \`robots.ts\` as functions, not static files, the moment any content is dynamic.
3. Server-rendered JSON-LD for anything with real structured-data value (articles, products, FAQs).
4. Audit any route serving large pre-rendered HTML — check whether it's a \`page.tsx\` that should be a \`route.ts\`.
5. Canonical tags on every page, unconditionally.

If you're evaluating whether a site's actual Lighthouse and SEO numbers back up these choices, [our PageSpeed comparison tool](/speed) runs real Google Lighthouse against any two URLs side by side — useful for confirming a fix like the Route Handler swap above actually moved the number, rather than assuming it did.`,
  },
];

let inserted = 0;
for (const p of posts) {
  const slug = slugify(p.title);
  const now = new Date();
  await db.post.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      tags: p.tags,
      status: "published",
      authorName: "The Framer → Next.js team",
      publishedAt: now,
      coverImage: `https://framertonextjs.com/blog/${slug}/opengraph-image`,
    },
  });
  inserted++;
  console.log("inserted:", slug);
}
console.log(`\ndone — ${inserted} posts`);
process.exit(0);
