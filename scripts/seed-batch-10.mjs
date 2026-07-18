import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Framer Agency Portfolio Template: What Clients Actually Notice First",
    excerpt: "Before clients read a single case study, a handful of structural details already shape whether they trust the agency behind the site.",
    tags: ["agency", "portfolio template", "framer", "clients"],
    content: `An agency's own portfolio site is unusual among marketing pages — the product being sold is the agency's design and execution judgment, and the site itself is the first sample of that judgment a prospective client sees.

## What clients register before reading anything

**Load speed.** A slow-loading agency site undercuts the pitch before a single word is read — if an agency can't make its own site fast, why would a client trust it with theirs. This is measurable, not subjective: run any agency site through PageSpeed Insights and the number itself becomes part of the pitch.

**Visual polish at the exact fidelity level you're selling.** If an agency sells premium, high-craft design work, the portfolio site needs to visibly demonstrate that same craft level — inconsistent spacing, unpolished responsive behavior, or generic stock-template feel undercuts the sell regardless of how good the actual case studies are.

**How fast a visitor reaches real work.** A long, animated intro sequence before any actual project appears is a common agency-site indulgence that costs attention a prospective client didn't come to spend on your intro animation — they came to see if you can do the work they need.

## What the case studies themselves need

Real outcomes, not just visuals. "Redesigned the homepage" says nothing about whether it worked. A specific, even modest metric (conversion lift, load time improvement, a client quote about a business outcome) does more convincing work than another beautiful screenshot.

## What a good agency template structurally provides

The section order and layout that supports this — a fast-loading hero, an immediate path to project work, case study pages with room for both visuals and outcome-focused writing, team and service sections that build credibility. See our related post on [choosing between portfolio, agency, and SaaS templates](/blog/how-to-choose-between-a-portfolio-agency-or-saas-framer-template) for the structural differences that matter here specifically.

[This site's free agency portfolio template](/templates) is built around exactly this structure — worth checking the live demo's load speed and section flow directly rather than judging from a screenshot.`,
  },
  {
    title: "Photography Portfolio Website: What Actually Matters Beyond the Photos",
    excerpt: "Great photos on a bad site still underperform. Here's what a photography portfolio needs to get right structurally.",
    tags: ["photography", "portfolio template", "framer"],
    content: `A photographer's portfolio site has one job that's easy to get wrong in a subtle way: get out of the way of the actual photographs, while still being fast, navigable, and easy for a potential client to act on.

## Where photography portfolios commonly go wrong

**Image weight killing load speed.** Photography sites are the single most common category to ship oversized, poorly-optimized images, because the instinct is "these need to look as good as possible" — which is true, but a 15MB uncompressed image doesn't actually look better on a typical screen than a well-compressed 500KB one; it just loads slower. See our post on Framer image optimization for what a properly optimized export actually improves.

**Navigation that buries the contact path.** A visitor who's decided they want to hire you shouldn't have to hunt for how — a clear, present contact path (not just an email buried in an about page) matters more than one more gallery.

**Inconsistent aspect ratios breaking a grid layout.** A portfolio grid mixing wildly different aspect ratios without a deliberate layout system looks unintentionally chaotic rather than curated — worth either cropping consistently or choosing a template layout built to handle mixed ratios gracefully.

**No categorization for a large body of work.** Past a certain volume of work, an undifferentiated single gallery becomes hard to browse — categories (by shoot type, by client, by year) help a visitor find relevant work faster than scrolling everything.

## What actually sells the work

Curation matters more than volume. A tightly-edited selection of your strongest 15-20 images outperforms an exhaustive 200-image dump, because it signals editorial judgment — itself a skill clients are implicitly evaluating.

## A structurally sound starting point

[This site's free photography portfolio template](/templates) is built specifically around this use case — clean grid layout, CMS support for adding new work without rebuilding pages, and a straightforward contact path — worth checking the live demo directly against your own work before customizing.`,
  },
  {
    title: "Developer Portfolio Template: What Recruiters and Clients Actually Look For",
    excerpt: "A developer's portfolio gets evaluated differently than a design portfolio — here's what actually matters to the people looking at it.",
    tags: ["developer", "portfolio template", "framer"],
    content: `A developer portfolio serves a different evaluation than a design portfolio — visitors are assessing technical judgment and real project depth, not just visual taste, and the site should be built with that in mind.

## What recruiters and technical hiring managers actually check

**Real project depth over volume.** Three well-documented projects with a genuine explanation of technical decisions and tradeoffs outperform ten one-line project mentions. The evaluation is "can this person reason about a real problem," not "how many things have they touched."

**Actual links to working code or live demos.** A project listed without a GitHub link or live URL reads as unverifiable — the strongest signal a developer portfolio can send is "here's the actual thing, go look at it," not just a description.

**The site's own technical execution.** For a developer specifically, the portfolio site itself is implicitly part of the evaluation — a developer portfolio that's slow, has broken responsive behavior, or ships obviously unoptimized assets undercuts the pitch in a way it wouldn't for a non-technical portfolio, because visitors reasonably expect a developer's own site to be well-built.

## What a good developer portfolio template structurally supports

A blog section alongside project showcases (writing about technical topics is a strong, differentiating signal many portfolios skip), clear project case-study pages with room for technical detail, and fast, clean execution that itself demonstrates competence.

## The blog-plus-portfolio combination specifically

Technical writing does real work a project list alone can't — it demonstrates how you think, not just what you've built. A developer portfolio template with a built-in blog layout removes the friction of maintaining writing and project work as two separate, disconnected things.

## A concrete starting point

[This site's free developer portfolio template](/templates) combines a project showcase with a built-in blog layout specifically for this use case — worth checking the live demo to see how the two sections work together before deciding whether it fits your own project mix.`,
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
