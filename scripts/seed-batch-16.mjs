import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Framer 3.0: What's New (and What Doesn't Change When You Export)",
    excerpt: "Framer 3.0 shipped AI Agents, Branching, and On-Page Editing and hit #1 on Product Hunt. Here's what actually changes for anyone planning to export that site to real code — and what genuinely doesn't.",
    tags: ["framer", "framer 3.0", "news", "export", "ai agents"],
    content: `Framer 3.0 launched June 16, 2026, and hit #1 on Product Hunt the same day. The headline additions are AI Agents (built into the canvas — they design pages, edit components, manage CMS content, and can fix site issues), Branching (a safe, separate version of your site you can test and review before merging into production), On-Page Editing (editing a live page directly in the browser rather than only in the canvas), a refreshed Community, and new pricing.

If you're planning to export a Framer 3.0 site — to this tool or any other — here's the honest answer to the question that actually matters: **does any of this change what comes out the other side?**

## What doesn't change

An export tool (this one included) works from the *published* site — the actual HTML, CSS, and JS Framer's hosting serves to a visitor. It has no visibility into, and no dependency on, how that markup was produced inside Framer's editor.

That means:

- **AI Agents** generate pages using Framer's normal components and layout primitives. The DOM an agent-built page publishes is structurally the same kind of DOM a hand-built page publishes — same class conventions, same runtime hooks. There's no separate "AI-generated" markup dialect to account for.
- **Branching** is entirely pre-publish. It's how you manage *which version* becomes live; once you merge and publish, the result is an ordinary published Framer page like any other. Nothing about having used a branch survives into the exported output.
- **On-Page Editing** changes *where* you make an edit (in the browser, against the live page) rather than *what* the resulting published markup looks like. The published result is the same shape as an edit made the traditional way in the canvas.

## Where to actually be careful

The one place this is worth a real caveat: AI Agents are new enough that if they start generating layout patterns Framer's editor has never produced before — a genuinely novel component structure, not just a new arrangement of existing ones — an export tool's detection logic (for things like nav structure, image handling, or animation start-states) could hit an edge case nobody's specifically tested yet. We haven't seen that happen, but "haven't seen it" isn't the same claim as "verified against every possible AI Agent output," and we'd rather say that plainly than pretend otherwise.

The practical answer: export a Framer 3.0 site the same way you'd export any other — [Pure Next.js](/nextjs) for byte-exact fidelity, [Framer to HTML](/framer-to-html) for a static, framework-free bundle — and treat the preview step as your actual verification, not a formality. That's true for a 3.0 site exactly as much as it was for 2.x.

## The bigger picture

Framer's own positioning is now explicitly "AI website builder for professional sites" — design, CMS, hosting, SEO, and now agents and branching, all in one stack. That's a reasonable pitch for staying inside Framer. It's a separate question from whether you *own* the result once it's built, which is the question this tool exists to answer: yes, at any point, in a form you can self-host with no ongoing platform dependency.`,
  },
  {
    title: "Next.js 16: Turbopack, Cache Components, and Middleware Renamed to Proxy",
    excerpt: "Turbopack is now the default bundler for both dev and build, a new use cache directive changes how you think about caching, and middleware.ts doesn't exist anymore — it's proxy.ts. Here's what that actually means, including a gotcha we hit firsthand.",
    tags: ["nextjs", "next.js 16", "turbopack", "news", "technical"],
    content: `This site's own converter runs on Next.js 16.2.9, so Next.js 16's changes aren't secondhand news to us — some of them, we hit directly. Here's what's actually new, condensed to what matters if you're maintaining a converted Next.js project or pointing an AI coding assistant at one.

## Turbopack is the default now — for build, not just dev

Since Next.js 16, Turbopack is stable and the default bundler for both \`next dev\` and \`next build\`, with production builds running 2–5x faster and Fast Refresh up to 10x faster. No config needed for the speed-up.

The real gotcha: if your project has a custom Webpack configuration, \`next build\` now **fails outright** instead of silently falling back to Webpack. That's a deliberate choice to stop misconfiguration from shipping quietly, but it means any older customized Next.js project needs an explicit decision — migrate the config or opt back into Webpack with \`--webpack\`. A [Pure Next.js export](/nextjs) from this tool doesn't ship a custom Webpack config, so this specific gotcha doesn't apply to it, but it's worth checking before you build if you've since customized the project yourself.

## Cache Components and \`use cache\`

Next.js 16 introduces Cache Components, built on Partial Prerendering: a \`use cache\` directive that lets you mark a page, component, or function as cacheable and let the compiler handle cache keys automatically, instead of reasoning about \`revalidate\` windows by hand. It's a real shift in how caching decisions get made in an App Router project — worth understanding before you reach for it, since it changes the *default* caching behavior for anything it's applied to, not just an opt-in speed boost.

## middleware.ts doesn't exist anymore — it's proxy.ts

This is the one we ran into directly while working on this exact project. Next.js renamed the "middleware" convention to "Proxy" — the file is now \`proxy.ts\`, the exported function is \`proxy\` instead of \`middleware\`, and it's meant to clarify that this code runs at the network boundary, not as general request middleware.

If you or an AI coding assistant goes looking for \`middleware.ts\` in a Next.js 16 project and comes up empty, this is why — check for \`proxy.ts\` before assuming the project has no request-gating logic at all. We mention it because we hit exactly that moment of "this file should exist and it doesn't" firsthand, and it cost real time before finding the actual answer in Next's own docs rather than guessing from older training data.

## DevTools MCP

Next.js also added DevTools MCP — a Model Context Protocol integration aimed at giving AI coding agents a structured way to inspect and debug a running Next.js app, rather than working blind from source alone. If you're already using an AI assistant to [refine a converted export](/blog/how-to-refine-a-framer-to-next-js-export-with-cursor-or-claude-code), this is the kind of tooling that closes the gap between "the assistant can read the code" and "the assistant can see what the app is actually doing."

## What this means if you're on a converted project

None of this changes what a [Pure Next.js](/nextjs) or [Framer to HTML](/framer-to-html) export from this tool looks like today — the generated projects don't lean on custom Webpack config, middleware, or cache directives. Where it matters is the moment you (or an assistant) start extending the project afterward: know that Turbopack now enforces config correctness at build time, that \`use cache\` is available if you want it, and that "proxy," not "middleware," is the file to reach for.`,
  },
  {
    title: "2026 Web Design Trends: Which Ones Survive Being Exported to Fast Code",
    excerpt: "Bento layouts, bold typography, 3D and WebGL, AI-assisted design workflows — 2026's biggest web design trends, and an honest look at which ones cost nothing to ship fast and which ones genuinely don't.",
    tags: ["design trends", "performance", "framer", "webgl", "2026"],
    content: `Every year's design trend roundup reads the same way — inspiring, a little breathless, and silent on the one question that actually determines whether a trendy site loads in under two seconds or ten. Here's 2026's list with that question actually answered.

## Bento / modular layouts — free

Bento-style grids that organize content into clearly bounded blocks are one of this year's most visible trends. Mechanically, this is CSS Grid and Flexbox — layout, not runtime behavior. It costs nothing extra to ship, converts cleanly with zero added JavaScript, and is one of the rare trends that's genuinely free performance-wise.

## Bold, oversized typography — mostly free

Custom fonts, oversized headlines, and layered type treatments are back as a way to make a first impression without relying on imagery. The performance cost here is almost entirely about *font loading*, not the design choice itself — [self-hosting the fonts](/blog/self-hosting-framer-fonts-why-it-matters-and-what-actually-changes) instead of round-tripping to a third-party font host is what actually determines whether bold type helps or hurts load time. The typographic trend itself is close to free; how the fonts get served is where the real cost lives.

## 3D, WebGL, and interactive scenes — genuinely not free

This is the one trend that has a real, unavoidable cost. A WebGL scene, an interactive 3D model, or scroll-triggered particle effects are actual JavaScript doing actual work in the browser — there's no conversion trick that makes that weight disappear, because the weight is the feature. What a good conversion pass *can* do is make sure the WebGL scene isn't sharing bundle space with dead weight it doesn't need: [Framer's JS bundle](/blog/framer-javascript-bundle-size-why-its-bigger-than-youd-expect) often carries analytics beacons, unused hover-state machinery, and interaction handlers for effects the page isn't even using. Stripping that leaves the 3D work you actually chose to pay for — not extra weight you didn't.

## AI-enhanced design workflows

More of 2026's site-building happens with an AI assistant in the loop — inside the design tool itself, as with [Framer 3.0's AI Agents](/blog/framer-3-0-whats-new-and-what-doesnt-change-when-you-export), or afterward, refining a converted export with something like Cursor or Claude Code. The trend worth naming honestly: AI involvement in *design* doesn't change what a browser has to download and execute. A page an AI agent assembled and a page a designer built by hand cost the same to load if they render the same DOM — the interesting optimization question is unchanged by who or what built the page.

## Human-centered design and accessibility

After a year of heavy AI and bold-minimalism experimentation, there's a real pull back toward making sites faster, more inclusive, and less gimmicky by default — not in opposition to the trends above, but as the thing that keeps them honest. It's the same instinct behind [the accessibility gaps every Framer export ships with](/blog/the-4-accessibility-gaps-every-framer-export-ships-with-and-how-to-fix-them): a site can be visually ambitious and still work for everyone, but only if that's a deliberate pass, not an afterthought.

## The actual takeaway

Most of 2026's design trends are layout and typography choices that cost nothing to ship fast. The one that does cost something — real interactive 3D — is worth choosing deliberately, not by default, and worth converting with a tool that strips everything *around* it rather than pretending the 3D itself is free.`,
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
