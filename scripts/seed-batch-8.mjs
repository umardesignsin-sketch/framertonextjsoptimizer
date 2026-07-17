import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "What Happens to Your Site If Framer Goes Down?",
    excerpt: "Every hosted platform has outages eventually. Here's what a Framer outage actually means for your site, and how an exported backup changes that.",
    tags: ["framer", "uptime", "hosting", "backup"],
    content: `No hosting platform has perfect uptime, Framer included — worth thinking through what an outage actually means for a site you don't control the infrastructure for, before it happens rather than during.

## The dependency you're accepting by staying fully on Framer

When your site is published and hosted entirely on Framer, its availability is entirely tied to Framer's infrastructure being up. That's not a criticism specific to Framer — it's true of every fully-hosted platform (Webflow, Squarespace, Shopify, all of them) — but it's worth being clear-eyed about: a platform-wide incident on their end takes your site down too, and there's nothing you can do from your side to mitigate it in the moment.

## Why this matters more for some sites than others

A personal portfolio being briefly unreachable during an outage is a minor inconvenience. A business's primary marketing site, a time-sensitive campaign landing page, or anything with real revenue or reputation riding on uptime is a different risk calculus — and one worth actively managing rather than just hoping doesn't happen.

## How an exported backup actually changes this

Having a periodically-updated, exported copy of your site — even if you're not actively using it as your primary hosting — means you're never more than a quick deploy away from having *something* live if your primary platform has an extended outage. This doesn't have to mean running dual infrastructure permanently; it can be as simple as: export a current copy, keep it somewhere ready to deploy (a GitHub repo, a Vercel project you're not actively pointing your domain at), and you have a genuine fallback plan rather than just waiting out someone else's incident with no options.

## A practical backup cadence

- After any significant content or design update, export a fresh copy
- At minimum, export periodically (monthly, for an actively-maintained site) even without a specific trigger
- Keep the exported copies somewhere durable — a Git repository is a natural fit, since it also gives you version history for free

This is the same logic as any other business continuity practice — you don't maintain backups because you expect disaster, you maintain them because the cost of having one is low and the cost of needing one without having it is high.`,
  },
  {
    title: "Framer Typography After Export: What Actually Carries Over",
    excerpt: "Font rendering, line-height, and letter-spacing are usually fine after export — but here's where subtle typographic drift actually happens.",
    tags: ["framer", "typography", "fonts", "export", "css"],
    content: `Typography is usually one of the more faithfully-preserved aspects of a Framer export, but "usually" isn't "always" — here's where subtle drift actually happens and how to catch it.

## What typically survives cleanly

Font family, size, weight, and basic styling (italic, letter-spacing, text-transform) map directly to CSS properties that carry through a well-implemented export without any translation loss — these are just values, copied faithfully.

## Where drift actually happens

**Font loading timing.** If a font isn't self-hosted correctly (see our dedicated post on Framer fonts after export), the browser may render a fallback system font briefly before the real font loads — a "flash of unstyled text" that wasn't present on the original Framer-hosted site if Framer's font loading was better optimized for that specific case.

**Variable font axis values.** If the original design used a variable font at a specific, fine-tuned weight or width setting (not just a standard preset like "bold"), make sure the exported CSS preserves the exact axis values rather than rounding to the nearest standard weight — this is an easy detail to lose if an export process normalizes font-weight values.

**Line-height and letter-spacing on responsive variants.** Since Framer often bakes multiple breakpoint variants into the page (see our post on breakpoints after export), each variant may have its own fine-tuned typographic values — a subtle export bug here shows up as text that's technically the right font and size, but feels slightly "off" at specific viewport widths, which is a harder issue to spot than an outright broken layout.

## How to actually check

Side-by-side comparison is the most reliable method here, since typographic drift is often too subtle to notice without a direct reference: open your original Framer-hosted site and your exported version in adjacent browser tabs/windows at the same viewport width, and compare key text blocks directly — headings, body copy, any text with specific letter-spacing or tight line-height. Font-rendering differences that are individually subtle are much easier to spot side-by-side than from memory.

## The one thing worth explicitly testing

Any text using a genuinely custom or licensed font (not a common Google Font) is worth double-checking specifically — these are more likely to hit an export edge case than the handful of extremely common fonts every export tool has been tested against repeatedly.`,
  },
  {
    title: "White-Labeling Framer Exports: A Guide for Agencies",
    excerpt: "If you're reselling Framer-to-code conversions as part of your agency's offering, here's what actually needs to be true for that to work.",
    tags: ["framer", "agencies", "white label", "reselling"],
    content: `Agencies that build client sites in Framer are increasingly offering "we'll also give you a portable, self-hosted version" as part of their service — a genuinely good value-add, worth doing properly rather than as an afterthought.

## Why this is a real service offering, not just a nice-to-have

Clients increasingly ask about platform lock-in before committing to a build, especially larger or more risk-conscious ones. Being able to say "yes, and here's exactly what you get if you ever want full independence from any platform, including us" is a genuine differentiator against agencies who either don't offer this or don't understand the technical tradeoffs well enough to explain them clearly.

## What "doing it properly" actually requires

**Understanding the tradeoffs yourself first**, not just the marketing pitch of whatever export tool you use. Know specifically what does and doesn't survive an export for your typical build pattern — see our posts on hover effects, forms, and mobile menus after export, since these are the most common things that need explicit attention, not automatic assumption.

**QA time built into the process**, not treated as optional. An export that "looks right" on a quick glance and one that's actually been clicked through, form-tested, and breakpoint-checked are different deliverables — only the second one is something you should confidently hand to a client as finished.

**Clear documentation of what you're delivering.** A short handoff document — what's included, what needed manual attention during export, any known limitations — protects both you and the client from mismatched expectations later.

## Pricing this as a service

Some agencies bundle export as a standard part of every project (a differentiator baked into the base offering); others treat it as an optional add-on at project close, priced to cover the actual QA time it takes to verify a clean handoff. Either works — what matters is that the actual verification work happens, since an unverified export handed over as "done" is where reputational risk lives, not in the export itself.

## The genuine business case

Clients remember agencies that reduced their risk, not just ones that delivered a good-looking site. Offering a real, verified export path is a concrete way to demonstrate that you're thinking about the client's long-term interests, not just the immediate deliverable — and it's the kind of thing that gets referred to other clients specifically.`,
  },
  {
    title: "Framer JavaScript Bundle Size: Why It's Bigger Than You'd Expect",
    excerpt: "A look at what's actually inside Framer's runtime bundle, and why 'just remove unused code' isn't a realistic fix from inside the editor.",
    tags: ["framer", "javascript", "bundle size", "performance", "technical"],
    content: `If you've inspected your Framer site's network requests and been surprised by the JavaScript payload size, here's what's actually in there and why it's not something you can meaningfully trim from inside the editor.

## What's actually in Framer's runtime bundle

Framer's client-side JavaScript isn't just "your site's interactive code" — it's a general-purpose runtime capable of rendering *any* Framer site's design, handling the full breadth of Framer's component variant system, animation engine (with real spring physics, not just CSS transitions), responsive breakpoint logic, and — notably — the machinery that makes Framer's own visual editor work in preview/edit contexts. Your specific site only exercises a fraction of that capability, but the bundle ships the general-purpose engine regardless, because Framer's build process isn't (as of today) tree-shaking the runtime down to only the features one particular published site actually uses.

## Why "just remove what I'm not using" isn't available to you

This is a platform-level architecture decision, not a per-site configuration option. You don't get a settings toggle for "I'm not using variant-based interactions, ship a smaller runtime" — the same bundle serves every Framer site, regardless of how simple or complex that particular site's actual interactivity is. A site with zero custom interactions beyond basic scroll reveals still ships essentially the same runtime weight as one making heavy use of Framer's full interaction system.

## What this means practically

If JavaScript payload size is showing up as a real Lighthouse Performance flag, editor-level optimization (image sizing, font choices, reducing animation count) genuinely helps at the margins, but there's a floor set by the runtime itself that no amount of in-editor optimization gets you below. That floor is a fixed cost of staying on Framer's hosted runtime.

## The only way past that floor

Removing the runtime entirely — a static HTML or JSX-based Next.js export that doesn't ship Framer's JS at all, reproducing the interactions your specific site actually uses (appear/scroll animations reliably, other interactions with varying fidelity — see our other posts on exactly what does and doesn't survive) with lightweight, purpose-built code instead of the general-purpose engine. This is the single biggest lever available if JS payload size specifically is your performance bottleneck, and it's structurally unavailable from inside Framer's own editor, by design.`,
  },
  {
    title: "Framer 404 Pages and Custom Error Pages After Export",
    excerpt: "Framer's default 404 handling doesn't automatically translate to a static export or new hosting. Here's how to set it up correctly.",
    tags: ["framer", "404", "export", "html", "nextjs"],
    content: `A working, on-brand 404 page is an easy thing to overlook after a Framer export — the site "works" without it (most links won't 404 in normal use), which is exactly why this gap often goes unnoticed until a real visitor hits it.

## What Framer provides by default

Framer supports a custom 404 page you design in the editor, served automatically by Framer's hosting whenever a request doesn't match a real page. That's a hosting-level behavior tied to Framer's own infrastructure.

## Why this needs explicit setup after export

**Static HTML hosting** generally needs an explicit 404 page configured at the hosting level — most static hosts (Netlify, Vercel, Cloudflare Pages) look for a specifically-named file (commonly \`404.html\`) and serve it automatically for unmatched routes, but only if that file exists in your deployed output. If your export didn't specifically generate one from your Framer site's custom 404 design, visitors hitting a broken link get the hosting platform's own generic error page instead of your branded one.

**Next.js** has its own built-in convention — a \`not-found.tsx\` (or \`404.tsx\` depending on router version) file that Next.js automatically uses for unmatched routes. If your export didn't specifically create this file from your Framer 404 design, you'll get Next.js's default generic not-found page.

## How to check if this is missing on your export

Visit a deliberately broken URL on your exported site (something like \`yoursite.com/this-page-does-not-exist\`) and see what renders. If it's a generic, unstyled error page rather than your Framer-designed 404, that's the gap — worth fixing, since it's a small, mechanical thing to add once identified.

## Why it's worth the ten minutes to fix

A broken link happens more often than site owners assume — an old bookmark, a typo in a shared URL, a page you renamed without a redirect (see our post on redirects after migration). A branded, helpful 404 page (with a link back to your homepage or search, ideally) keeps that moment from being a dead end that reflects poorly on an otherwise polished site. It's a small detail, but it's exactly the kind of small detail a genuinely thorough export process should carry forward rather than silently dropping.`,
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
