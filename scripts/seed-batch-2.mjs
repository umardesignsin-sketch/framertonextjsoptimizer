import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Framer vs Webflow (2026): Which Should You Actually Build On?",
    excerpt: "Both are visual builders that hand you a locked-in hosting bill. Here's the honest, practical difference — and what leaving each one looks like.",
    tags: ["framer vs webflow", "comparison", "framer", "webflow"],
    content: `Framer and Webflow get compared constantly, and most comparisons stop at "design experience" — which misses the question that actually matters once you've shipped a real site: what happens to your work if you ever want to leave.

## Where they're genuinely similar

Both are visual, no-code website builders aimed at designers who want production-quality output without hand-writing code. Both host what you publish on their own infrastructure and charge recurring fees tied to that hosting. Both support CMS-driven content, custom domains, and reasonably capable interaction/animation systems. If you're choosing purely on "can I design what I want without a developer," they're closer than either company's marketing suggests.

## Where they actually diverge

**Design model.** Framer's canvas is closer to Figma — free-form, layer-based, and it shows in how naturally Figma imports translate. Webflow's is closer to a visual box-model editor, closer to how CSS actually thinks, which some developers prefer and some designers find more restrictive.

**Interactions.** Framer leans on component variants and a JS runtime (similar in spirit to Framer Motion, the animation library, which — confusingly — shares a name but isn't the same product). Webflow's interactions panel is more explicitly timeline/trigger based. Neither is "better" in the abstract; they suit different mental models.

**Code export.** This is the sharpest difference. Webflow has offered a form of code export for years — genuinely portable HTML/CSS/JS, though the class-naming and structure it generates is famously verbose. Framer has no official export path at all; published sites are locked to Framer's hosting by design, and Framer's own team has said publicly they don't consider a runtime-free export feasible given how much of the experience depends on their backend (image optimization, analytics, dynamic CMS routing).

**What "leaving" looks like.** Because Webflow ships an export button, migrating off Webflow hosting is a supported (if imperfect) path. Migrating off Framer means either manually rebuilding, or using a third-party converter — there's no first-party way to just download your site.

## The practical takeaway

If avoiding platform lock-in matters to you *before* you commit months of design work, that's the one factor worth weighing over everything else in this comparison — because it's the one neither tool will let you undo cheaply after the fact. Webflow gives you a supported exit. Framer doesn't, which is exactly the gap tools like this one exist to fill: converting a published Framer site into a real, portable Next.js or static HTML project you can host anywhere.`,
  },
  {
    title: "Framer vs Squarespace: Design Freedom vs Simplicity",
    excerpt: "Squarespace optimizes for 'I don't want to think about this.' Framer optimizes for pixel control. Here's how that plays out for a real project.",
    tags: ["framer vs squarespace", "comparison", "framer"],
    content: `Framer and Squarespace serve genuinely different intents, even though both show up in "best website builder" lists together.

## Who each one is actually for

Squarespace is built around templates you customize, not a blank canvas you design from scratch. That's a feature, not a limitation — for a photographer, a small business, or anyone who wants a professional site without making a hundred design decisions, Squarespace's constraints are what make it fast. You pick a template, swap content, done.

Framer removes almost all of those guardrails. You're designing from a blank canvas with real layout control — closer to designing in Figma than filling in a template. That freedom is exactly what makes Framer appealing to designers and agencies who need something that doesn't look like a template, and exactly what makes it overkill for someone who just wants a clean site fast.

## Where they're actually similar (and it matters)

Both are fully hosted platforms — you don't own the infrastructure, and both lock published output to their own hosting with no meaningful code export. If lock-in is a concern, this comparison is closer than the design-philosophy difference suggests: neither gives you a real way to leave with your site intact.

## Pricing shape

Both charge monthly for hosting on top of whatever plan tier you need for custom domains, CMS, or e-commerce. Squarespace's tiers are simpler and more predictable; Framer's paid tiers scale with things like CMS item count and traffic, which can surprise people who started on a free/cheap plan and grew.

## Which to actually pick

If you want speed and don't need pixel-level design control: Squarespace. If you want full design freedom and are comfortable with (or actively want) a more involved build process: Framer. If either concern is "what happens if I want to self-host later" — that's a real limitation on both, and for Framer specifically, a Framer-to-HTML or Framer-to-Next.js converter is currently the only practical way around it.`,
  },
  {
    title: "Framer vs Webstudio: The Open-Source Alternative, Explained",
    excerpt: "Webstudio is a newer, open-source visual builder that explicitly promises no lock-in. Here's how it actually compares to Framer on that specific claim.",
    tags: ["framer vs webstudio", "comparison", "framer", "open source"],
    content: `Webstudio is worth knowing about specifically because it's built to answer the exact complaint most people have about Framer: lock-in.

## What Webstudio actually is

Webstudio is an open-source, visual website builder — you design visually, similar in spirit to Framer or Webflow, but the project is explicit that you're not locked to any particular hosting. You can self-host the generated output or deploy it through their platform; the code itself is meant to be genuinely yours, not trapped behind a proprietary runtime.

## The honest comparison

**Maturity.** Framer has years of polish, a large template/plugin ecosystem, and a much bigger user base. Webstudio is younger and smaller — fewer templates, fewer third-party integrations, a smaller community to lean on when you're stuck.

**Design capability.** Framer's canvas and component system are more refined right now, especially for complex interactions and animations. Webstudio is closing that gap but isn't at parity yet for advanced use cases.

**Lock-in.** This is the category Webstudio was explicitly built to win, and on paper it does — open-source, no forced hosting, genuine portability by design rather than as an afterthought.

## Where this leaves you if you're already on Framer

If you haven't built anything yet and lock-in is your top concern, Webstudio is worth seriously evaluating before you invest months into a Framer build you might later want to leave. But if you've already built and published on Framer, switching platforms means rebuilding from scratch in Webstudio's editor — there's no direct Framer-to-Webstudio import.

That's a meaningfully different problem than "get my existing Framer site off Framer's hosting," which is what a Framer export/converter solves without a rebuild — you keep the design and content you already have, you just stop depending on Framer's hosting for it.`,
  },
  {
    title: "Is Framer Good for SEO? What Actually Matters",
    excerpt: "Framer sites often score worse than they should on SEO audits — not because Framer can't rank, but because of specific, fixable defaults.",
    tags: ["framer seo", "seo", "framer", "lighthouse"],
    content: `"Is Framer good for SEO" gets asked constantly, and the honest answer is: Framer gives you the tools to rank well, but its defaults leave real performance and technical SEO on the table that most users never go back to fix.

## What Framer gets right by default

Framer sites are server-rendered, which matters — Google can read the actual content without executing JavaScript first, unlike a pure client-side SPA. You also get straightforward controls for meta titles, descriptions, and Open Graph tags per page, plus clean, semantic-enough HTML output. None of that is the problem.

## Where Framer sites commonly lose points

**JavaScript weight.** Framer's runtime — the code powering animations, interactions, and the visual editor's live-editing capability — ships to every visitor, even ones who'll never interact with a single animated element. That's real bytes and real main-thread work that a Lighthouse Performance audit penalizes directly, and Performance is itself a (soft) ranking signal via Core Web Vitals.

**Image handling.** Depending on how images were placed and sized in the Framer editor, exports can under-optimize — serving larger files or a less modern format than necessary, which shows up as flagged opportunities in a PageSpeed report.

**Font loading.** Framer typically loads fonts from its own CDN rather than self-hosting them, adding an extra DNS/connection round-trip before text renders — a small but real hit to Largest Contentful Paint.

**The "Made in Framer" badge and framerusercontent.com dependency**, while not an SEO factor directly, are a visible reminder of a platform dependency some businesses would rather not have on a page representing their brand.

## What actually moves the needle

1. Run a real Lighthouse audit on your live site, not a guess — the specific flagged items differ per site.
2. If Performance is the weak score, the JS runtime weight is almost always the biggest single factor.
3. Self-hosting fonts and re-encoding images to WebP typically close most of the remaining gap.
4. Content and technical basics (headings, internal links, meta tags) matter as much on Framer as anywhere else — Framer doesn't handle content strategy for you.

If you've already published on Framer and want to see exactly where you stand, comparing your live site's Lighthouse scores against a runtime-stripped, self-hosted version of the same content is the fastest way to see how much of your SEO ceiling is platform overhead versus content work still to do.`,
  },
  {
    title: "How to Speed Up a Slow Framer Website (Without Leaving Framer)",
    excerpt: "Before you export anything, these are the levers you can actually pull inside the Framer editor itself to improve real-world load performance.",
    tags: ["framer performance", "framer", "speed", "lighthouse"],
    content: `Not everyone exporting a Framer site is trying to leave — some just want it faster, and there's genuine room to improve performance without touching hosting at all.

## Start with a real measurement

Before changing anything, run your live URL through PageSpeed Insights or Lighthouse directly. Guessing at what's slow wastes effort; the report tells you exactly which resource or metric is actually the bottleneck for your specific page.

## The levers that are actually inside your control

**Image sizing and format.** Upload images at the resolution they'll actually render at, not your camera's native size — Framer doesn't always aggressively downscale for you. Where possible, favor formats Framer will serve efficiently, and avoid dropping in unnecessarily large source files "just in case."

**Font choices.** Every additional font family and weight is a separate network request before text can render in that style. Audit your type scale — it's common to find 2–3 weights of a family in use when one or two would do the same job visually.

**Animation and interaction density.** Every appear animation, scroll effect, and interactive component adds runtime work. This doesn't mean cut all motion — it means being deliberate: a hero section with five simultaneously-animating elements is doing five times the layout/paint work of one with a single focal animation.

**Page structure.** Long single pages with everything loaded up front will always be heavier than the same content split across routes, if your content genuinely supports being split.

**Third-party embeds.** Every embedded widget (chat, video, forms from another provider) adds its own JS payload on top of Framer's own runtime. Audit what's actually earning its weight.

## What Framer's platform overhead means you can't fix from inside the editor

The core JS runtime itself — the code that makes the visual editor and Framer's interaction system work — ships regardless of how lean your content is. That's a fixed cost of staying on Framer's platform, not something editor-level optimization removes. If you've done everything above and Performance is still capped lower than you'd like, that ceiling is coming from the runtime itself, not your content choices — and the only way past it is not shipping that runtime to visitors at all, which is what a runtime-stripped static export does.

Whether that tradeoff (leaving the editor's live-editing convenience behind) is worth it depends entirely on how much the remaining performance gap actually matters for your specific site.`,
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
