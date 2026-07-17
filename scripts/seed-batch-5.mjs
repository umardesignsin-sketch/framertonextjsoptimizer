import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Framer to Next.js for Developers: What You're Actually Getting",
    excerpt: "A technical look at what a genuine Framer-to-Next.js export produces — project structure, component splitting, and where the real work still is.",
    tags: ["framer", "nextjs", "developers", "react", "technical"],
    content: `If you're a developer inheriting a Framer site — handed off by a designer, or picking up a marketing site you now need to maintain in code — here's what to actually expect from a Framer-to-Next.js conversion, without the sales framing.

## What a real conversion produces

A proper Next.js export gives you an actual App Router project: \`package.json\`, \`next.config.js\`, \`tsconfig.json\`, and one route per page — either as genuine JSX Server Components with the markup split into reusable pieces, or (depending on the export mode) as route handlers serving Framer's original rendered output directly. Either way, it's a real, buildable, deployable Next.js project you can \`npm install && npm run build\` — not a wrapper or an iframe.

## Where the two approaches actually differ

**JSX-component output** gives you real, editable React markup — you can open a component file and see actual JSX, refactor it, extend it, add real React state and logic on top. The tradeoff: reproducing Framer's runtime-driven interactions (hover states, click-triggered menus, scroll-linked transforms) in plain code is a genuine engineering problem, not a solved one — some interactions end up approximated or missing, because the data those interactions depend on simply isn't present in Framer's static output.

**Runtime-intact output** keeps Framer's actual JS running, wrapped in a Next.js route. Every interaction behaves identically because it's genuinely the same code — but you're not actually looking at editable component structure; you're serving the original HTML/JS payload through a Next.js shell. Good for "get this off Framer's hosting with zero behavior risk," less good if your actual goal is "give me code I can extend."

## What to check before you commit to either

- Open a few component files (if JSX output) and judge the actual code quality — is it something you'd want to build on, or effectively obfuscated markup?
- Test every interactive element manually — menus, hover states, forms, any custom animation — don't assume "it converted" means "it all works."
- Check whether Framer's original class names were preserved or renamed. Renaming introduces real regression risk for a marginal readability gain; a good export leaves them alone.
- If you plan to keep developing the site in code going forward (not re-exporting from Framer again), JSX output is the only path that makes that realistic. If you're just trying to get off Framer's hosting bill with the least risk, runtime-intact is often the more honest choice.

Neither approach is strictly better — they answer different questions, and knowing which one you're actually asking is the first step.`,
  },
  {
    title: "Handing Off a Framer Site to a Development Team: A Practical Checklist",
    excerpt: "Designers ship a site in Framer, developers need to take it from there. Here's what actually needs to happen for that handoff to go smoothly.",
    tags: ["framer", "handoff", "developers", "agencies", "checklist"],
    content: `The design-to-development handoff is where a lot of Framer projects hit friction — the design is done and approved, but "done in Framer" and "ready for a dev team to build on" are different things.

## Why this handoff is harder with Framer than with, say, Figma

A Figma handoff is inherently a *reference* — developers were always going to build the actual site in code from that reference. A Framer handoff is different because the site is often already fully built and published — the question isn't "build this from a design," it's "take this already-working thing and make it something engineering can extend," which raises the bar for what "handoff" even means.

## What to actually hand off

- **The live published URL**, obviously — but also access to the Framer project itself if any further design iteration will happen there before the code handoff is final.
- **A real code export**, not just the design reference. If engineering is going to extend this site, they need an actual project structure to work from — see our guide on what a Framer-to-Next.js export for developers actually looks like.
- **A list of anything interactive that needs explicit verification** — forms, custom animations, CMS-driven pages — since these are exactly the things most likely to need engineering attention post-export (see our posts on forms and hover effects after export specifically).
- **Domain and DNS ownership clarity** — who controls the domain, and is it moving to new hosting as part of this handoff, or staying put with just the codebase changing underneath it.

## The mistake that causes the most rework

Treating the export as the finish line rather than the starting point. A code export gets you real, buildable code — it doesn't automatically mean every interaction is production-verified. The teams that have the smoothest handoffs budget explicit QA time post-export: click through every page, test every form, resize through every breakpoint, before calling the handoff complete.

## If you're the agency doing the handing off

Being upfront with the client about what does and doesn't survive an export (see our agency-specific guide on Framer to HTML for client handoff) sets expectations correctly from the start, rather than surprising a development team — or the client — after the fact.`,
  },
  {
    title: "Should a Non-Technical Founder Export Their Framer Site?",
    excerpt: "If you built your site yourself in Framer and aren't a developer, here's an honest look at whether exporting makes sense for you specifically.",
    tags: ["framer", "founders", "non-technical", "export"],
    content: `Most Framer export guides assume you're a developer or agency. If you're a solo founder who built your own site in Framer's editor and isn't planning to touch code, the calculus is genuinely different — here's the honest version for you.

## The case for staying on Framer

If you're actively editing your site regularly — updating copy, adding pages, tweaking design — Framer's visual editor is a real, meaningful advantage you'd lose by exporting to raw code. A static HTML or even Next.js export isn't something you edit the same way; changing text means editing code (or using a separate visual editor tool built on top of the export), which is a real workflow change if you're not comfortable with that. If you're happy paying for hosting and value staying inside the editor, there's no compelling reason to export just because you technically can.

## The case for exporting anyway

**Cost.** If you're paying for Framer hosting mainly for a mostly-static site that doesn't change often, self-hosting an exported version can be meaningfully cheaper long-term, sometimes free.

**Insurance.** Even if you don't switch hosting today, having an exported backup means you're not one missed payment or platform decision away from your site disappearing — see our post on what actually happens if you stop paying for Framer.

**Performance.** If Lighthouse scores or load speed matter to you (they do for SEO and conversion rate), a runtime-stripped export is measurably faster in most cases — worth it even if you're not trying to leave Framer's ecosystem entirely.

## The realistic middle ground

You don't have to choose once and commit forever. Keep designing and editing in Framer's editor — it's genuinely good at that — and periodically export a portable copy, either as insurance you hope never to need, or to actually deploy on cheaper/faster hosting while still doing your day-to-day content edits back in Framer. Many export tools also include a lightweight visual editor for the exported site specifically, letting you make small text/link/image changes post-export without touching code — worth checking if that matters to your workflow before ruling out exporting entirely.

The honest bottom line: exporting isn't an all-or-nothing "leave Framer" decision. It's closer to "keep a portable, cost-effective copy of the site you already built," which is a much lower-stakes call.`,
  },
  {
    title: "Framer for E-Commerce: What Exporting Actually Means for a Store",
    excerpt: "Framer's e-commerce support relies on Framer's own checkout infrastructure. Exporting the site doesn't export a working store — here's the real picture.",
    tags: ["framer", "ecommerce", "export", "shopify"],
    content: `If you're running an e-commerce store built on Framer, the export conversation is meaningfully different from a marketing or portfolio site — the store functionality itself doesn't come along for the ride.

## What actually depends on Framer's backend

Product listings, cart state, checkout, and payment processing on a Framer store run through Framer's own commerce infrastructure (or a connected provider, depending on setup) — none of that is static markup you can export and have keep working. A runtime-stripped HTML export of a Framer store gets you the *design* — product pages, layout, branding — with none of the actual buying functionality intact. Add-to-cart buttons and checkout flows will not work against exported static output.

## What this means practically

**For a store that's actively selling:** exporting the design isn't a real path to "leave Framer while keeping the store running" — you'd need to rebuild commerce functionality against a different platform's backend (Shopify, a headless commerce API, Stripe Checkout directly) and wire the exported design up to it, which is a genuine development project, not a one-click conversion.

**For a landing page or catalog with checkout elsewhere:** if your "store" is really a product showcase that links out to a separate checkout flow (a Shopify Buy Button, a Stripe payment link), the export story is much closer to a normal marketing site — the showcase pages export fine, since they were never depending on Framer's own commerce backend to begin with.

## The realistic path if you want to leave Framer commerce specifically

1. Decide on your actual commerce backend first (Shopify, WooCommerce, a headless setup) — this decision matters more than the export tooling.
2. Export the Framer site's design for reference and for any pages that are genuinely static (about, FAQ, non-commerce content).
3. Rebuild the storefront pages against your chosen commerce backend, using the exported design as a visual reference rather than expecting it to plug in directly.

This is meaningfully more work than exporting a marketing site, and worth knowing upfront rather than discovering after an export that your checkout button does nothing.`,
  },
  {
    title: "Framer Image Optimization: What Gets Better (and What Doesn't) After Export",
    excerpt: "Framer's own image pipeline is decent but not aggressive. Here's what a good export actually improves, concretely.",
    tags: ["framer", "images", "performance", "webp", "export"],
    content: `Image weight is consistently one of the biggest levers in any website's performance budget, and Framer's default image handling leaves real room for improvement that a good export can capture.

## What Framer does by default

Framer serves images through its own CDN with some automatic optimization — format negotiation and reasonable compression happen, so it's not that Framer ships raw, unoptimized files. But the defaults are generalized, not tuned per-image, and don't always pick the most aggressive reasonable format or size for a given placement.

## What a thorough export actually improves

**Re-encoding to WebP.** Where source images are JPEG or PNG, converting to WebP at a well-chosen quality level typically cuts file size substantially with no visible quality loss for most photographic and UI imagery — this is usually the single biggest win available.

**Right-sizing for actual display dimensions.** If an image is uploaded at a much higher resolution than it's ever displayed at, serving the oversized original wastes bandwidth on every page load. A proper export should be pulling actual rendered dimensions and generating appropriately sized outputs rather than passing through whatever was originally uploaded.

**Self-hosting instead of an external CDN dependency.** Beyond the file size itself, serving images from your own domain instead of \`framerusercontent.com\` removes an external DNS/connection hop, which matters for Largest Contentful Paint — a Core Web Vital that directly factors into both user experience and search ranking.

## What doesn't automatically improve

Re-encoding a poorly-composed or oversized *source* image (say, an unnecessarily huge hero photo where a smaller crop would've looked identical) doesn't fix the underlying content choice — that's still worth revisiting manually if you're optimizing seriously. Export tooling can only work with what's actually there.

## How to verify it worked

Check a few image requests in dev tools' Network tab on your exported site — confirm the format is WebP (or another modern format) where it makes sense, the file sizes look reasonable for their displayed dimensions, and requests are coming from your own domain rather than Framer's CDN. A quick before/after Lighthouse comparison on the same page is the fastest way to see the aggregate impact.`,
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
