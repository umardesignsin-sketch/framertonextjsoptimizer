import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "The Best Framer to Next.js Converter Options in 2026, Compared Honestly",
    excerpt: "Whole-site URL converters, a paid per-page service, and component-level export via a plugin + CLI are three genuinely different tools solving different problems. Here's which one actually fits what you're trying to do.",
    tags: ["framer", "nextjs", "converter", "comparison", "unframer", "convertframer"],
    content: `Search for a Framer to Next.js converter and you'll find tools that don't actually compete with each other as much as the search results make it look — they solve different problems at different granularity. Here's an honest breakdown of the real options as of 2026, so you pick based on what you're actually trying to do rather than whichever result ranks first.

## Whole-site, URL-based converters

This is the category this tool is in, alongside [ConvertFramer](https://convertframer.com). You give it a published Framer URL; it gives you back an entire deployable site.

**This tool (FramerToNextJS)** — free, works directly from a public URL, no file export or browser extension required. Every conversion preserves Framer's appear/scroll animations (rebuilt from Framer's own authored animation data, not approximated) and responsive breakpoints, includes a live in-app preview before you commit to anything, and outputs either a [Pure Next.js project](/nextjs) or an optimized static HTML bundle. One-click deploy to Netlify or Vercel, or download the project and take it anywhere.

**ConvertFramer** — a paid, per-page service ($15/page for automated conversion) built around exporting a \`.cfp\` file from Framer and uploading it through a Chrome extension. Based on their own published pricing, animation restoration and full responsive behavior aren't part of the base automated tier — they're part of a separately-priced Production Migration tier aimed at more complex, animation-heavy projects with a human-assisted rebuild. That's a legitimately different kind of offering: a done-for-you migration service rather than a self-serve converter, and it's a reasonable choice specifically when you want someone else driving the migration. See the [full side-by-side](/vs/convertframer) for the complete comparison.

## Component-level export: the official React Export plugin + unframer

This is a genuinely different category, not really "converting a site" at all — it's pulling *specific components* out of a Framer project and into an existing React or Next.js codebase you already have.

The pipeline is two pieces working together: Framer's own **React Export** plugin (built by Tommy D. Rossi, listed on Framer's marketplace) lets you mark components for export inside the Framer editor itself. The **unframer** CLI then does the actual download — \`npx unframer {projectId} --outDir ./src/framer\` — pulling those marked components out as fully-typed React files with SSR support, preserved animations, and automatic responsive-variant handling.

The important distinction: this requires access to the *Framer project itself* (you need the plugin installed and components selected inside Framer's editor), not just a published URL. It's built for a different situation than "I have a finished Framer site and want it as Next.js" — it's built for "I'm actively building a React app and want to hand-pick specific Framer-designed pieces (a hero section, a pricing table) to drop into it," component by component, rather than getting one complete deployable site back.

## Which one actually fits you

- **You have a finished, published Framer site and want the whole thing as a deployable, self-hosted project** — a whole-site converter is the right category. Use this tool if you want that for free with animations and responsiveness included by default; use ConvertFramer's Production Migration tier specifically if you want a human-assisted rebuild and are fine paying for it.
- **You're building a React/Next.js app from scratch and want to reuse a few specific Framer-designed components inside it** — the React Export plugin + unframer is the right tool, because that's precisely the granular, component-level job it's built for.
- **You only have the published URL, not access to the original Framer project** — a whole-site converter is your only option, since component-level export requires editor access unframer doesn't provide from a URL alone.

None of these are really "which is best" in the abstract — they're solving different problems, and picking based on the actual shape of your problem (whole site vs. specific components, URL-only vs. project access) matters more than picking whichever tool a "best of 2026" list puts first. Including this one.`,
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
    },
  });
  inserted++;
  console.log("inserted:", slug);
}
console.log(`\ndone — ${inserted} posts`);
process.exit(0);
