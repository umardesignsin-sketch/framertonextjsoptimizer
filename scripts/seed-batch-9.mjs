import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Free Framer Portfolio Templates: What to Look for Before You Pick One",
    excerpt: "Not every free Framer template is actually production-ready. Here's what separates a genuinely usable one from a pretty demo.",
    tags: ["framer", "templates", "portfolio", "free"],
    content: `Free Framer templates are everywhere, and the gap between "looks great in the preview" and "actually works when you customize it" is bigger than most people expect going in.

## What actually matters in a free template

**CMS support, if you'll ever add more content.** A portfolio or blog template without CMS collections means every new project or post is a manual copy-paste of a whole page section. If you expect to add content regularly, check for this before you commit design time to a template that doesn't have it.

**Real responsive behavior, not just a desktop screenshot.** Preview the live demo (not just marketplace thumbnails) at mobile width specifically — some templates look sharp on desktop and fall apart or feel like an afterthought on phone screens, which is where a large share of portfolio traffic actually lands.

**Forms that go somewhere.** If the template includes a contact form, check what happens when you submit it in the demo — a template's form is only as useful as whatever it's wired up to.

**Genuine performance, not just a good design.** A template loaded with animations and heavy media can still ship a slow Lighthouse score. If you care about load speed, run the live demo through PageSpeed Insights before you commit.

**License clarity.** "Free" templates vary in what you're actually allowed to do — personal use only, client work allowed, resale allowed. Check the specific template's terms before using it for anything commercial.

## A practical way to evaluate before committing

1. Open the live demo, not just marketplace screenshots.
2. Resize to mobile width and click through every page.
3. Submit the contact form (if any) and see what happens.
4. Run the demo URL through a quick Lighthouse check.
5. Confirm the license covers your actual use case.

## Where to find genuinely real, checkable templates

Free Framer templates that are fully live and previewable — not locked behind a signup — let you do this evaluation before spending any time customizing. [Browse a set of free, live-previewable Framer templates](/templates) across portfolio, agency, and SaaS categories to see what a properly checked-out template looks like before picking one.`,
  },
  {
    title: "Portfolio Website Template vs Building From Scratch: What's Actually Faster",
    excerpt: "Starting from a template feels like cutting corners, but the real time math usually favors it — here's the honest breakdown.",
    tags: ["portfolio template", "framer", "website template"],
    content: `The instinct to build a portfolio site entirely from scratch — to make sure it's truly "yours" — is understandable, but the actual time math rarely favors it once you look closely.

## What building from scratch actually costs

Starting from a blank canvas means making dozens of small design decisions before you've written a single word of real content: spacing scale, type hierarchy, color system, section layouts, responsive behavior at every breakpoint, animation choices. Each of these is individually quick, but they compound into real hours or days before you have anything worth showing anyone.

## What a good template actually saves

A well-built portfolio template has already made those decisions, tested at every breakpoint, with animations and interactions already wired up. What's left is the part that's genuinely yours anyway: your actual project images, your case study writing, your bio, your contact details. That's the content only you can provide — no template shortcuts that.

## Where "from scratch" is actually the right call

If your portfolio's whole point is demonstrating a highly distinctive visual style (you're a designer whose portfolio IS the pitch for how you think about layout and interaction), starting from scratch is arguably part of the deliverable — the site itself is a portfolio piece. For most other cases — developers, photographers, freelancers, agencies showcasing client work rather than personal design taste — the site is a vehicle for the content, not the content itself, and a strong template gets you there faster with no real quality tradeoff.

## The middle ground most people actually want

Start from a genuinely well-built template, then customize meaningfully — swap the type scale if it doesn't match your taste, adjust the color system, rearrange sections that don't fit your specific work. This gets you 80% of "from scratch" distinctiveness at a fraction of the time, because you're editing decisions that already work rather than inventing them from zero.

If you want to see what a properly built starting point looks like, [browse a set of free portfolio and agency templates](/templates) with real live previews — the honest test of "is this worth starting from" is whether the demo holds up under real inspection, not just a marketplace screenshot.`,
  },
  {
    title: "SaaS Landing Page Template: What Actually Converts",
    excerpt: "Most SaaS landing page templates look similar. The ones that actually convert share a few specific, checkable properties.",
    tags: ["saas", "landing page", "framer", "conversion"],
    content: `SaaS landing pages have converged on a fairly standard visual pattern — hero, social proof, features, pricing, CTA — which makes it easy to assume any template following that pattern will convert similarly. It won't. The details inside that pattern are what actually matter.

## What separates a converting layout from a generic one

**A hero that states the actual outcome, not just the category.** "The platform for X" tells a visitor what category you're in; it doesn't tell them what changes for them. A hero built around a specific, concrete outcome converts better than one built around a category label — this is a copy decision the template can support but can't make for you.

**Social proof placed early, not just at the bottom.** Trust signals (logos, a testimonial, a usage stat) working near the top of the page reduce bounce before a visitor has decided whether to keep reading — a template with only a footer logo strip is wasting this lever.

**Pricing that's genuinely easy to compare.** If your SaaS has tiers, the pricing section's actual layout — how easy it is to see what's different between plans at a glance — measurably affects conversion. A cluttered or overly clever pricing table works against you regardless of how nice it looks.

**A CTA that appears more than once.** A single "Get Started" button at the very top is easy to miss once someone starts scrolling. Multiple, contextually-placed CTAs (after the features section, after pricing) catch visitors at the moment they've actually been convinced.

## What a template can and can't do for you

A well-built SaaS template gives you the structural pattern (section order, responsive behavior, visual hierarchy) that supports good conversion — it can't write your specific value proposition, and it can't know your actual pricing strategy. The conversion work that's genuinely yours to do is the copy and the specific proof points, not the layout.

## A practical starting point

[This site's free SaaS landing page template](/templates) is a real, live-previewable starting point built around this exact structure — worth checking against your own copy before assuming you need something custom-built from scratch.`,
  },
  {
    title: "How to Choose Between a Portfolio, Agency, or SaaS Framer Template",
    excerpt: "The category labels on Framer templates aren't just marketing — they reflect real structural differences worth understanding before you pick.",
    tags: ["framer", "templates", "portfolio", "agency", "saas"],
    content: `Framer's marketplace categorizes templates by use case — portfolio, agency, SaaS, and more — and those categories reflect genuinely different structural assumptions, not just different visual themes.

## Portfolio templates

Built around showcasing a body of work by one person or a small team: project galleries, case study pages, a bio/about section, often a résumé-style history. The structural assumption is "one person's work, presented chronologically or by category." If you're a freelancer, photographer, or individual creative, this is almost always the right starting category.

## Agency templates

Structurally similar to portfolio templates but built around a team and client relationships rather than one person: service pages, team member sections, client testimonials, and often a more explicit "hire us" conversion path throughout. If you're representing a studio or team rather than yourself individually, an agency-categorized template will already have the right sections in place — client-facing service descriptions, team bios — that a personal portfolio template would need real restructuring to support.

## SaaS templates

Built around a single product's value proposition: hero, features, pricing, social proof, a strong CTA — see our dedicated post on what actually makes a SaaS landing page convert. If you're marketing a software product rather than showcasing work, this category's structure (persuading toward a specific action) is fundamentally different from a portfolio's structure (showcasing a body of work).

## Why picking the right category saves real time

Starting from a template built for the wrong use case means either fighting its existing structure (removing sections that don't apply, adding ones that do) or leaving it visually mismatched to your actual content. Starting from the right category means the sections you need are largely already there — you're filling in content, not restructuring layout.

## Where to actually check

[This site's free template collection](/templates) is tagged by exactly these categories — agency, portfolio, SaaS — with real live previews, so you can confirm a template's actual structure fits your use case before committing design time to customizing it.`,
  },
  {
    title: "Do Free Framer Templates Come With CMS Support?",
    excerpt: "Not all free templates include CMS collections — and that distinction matters a lot more than it looks like upfront.",
    tags: ["framer", "cms", "templates", "free"],
    content: `Whether a free Framer template includes CMS support is one of the most consequential, least visible differences between templates — invisible in a screenshot, hugely important once you're actually maintaining the site.

## Why this matters more than it seems

Without CMS support, adding a new project, blog post, or case study means manually duplicating a page section and editing every piece of content inside it by hand. With CMS support, you add one new entry to a collection and the template's existing design automatically generates a new page or card for it. For a site you'll update more than once or twice, this difference compounds fast.

## How to actually check before committing

Look at the template's listed features (most Framer marketplace listings tag this explicitly — "CMS" as a feature) rather than assuming from the demo alone, since a demo with only 3-4 projects can look identical whether it's CMS-backed or hand-built either way.

## What CMS support typically covers in a Framer template

Usually project/portfolio items, blog posts, or case studies — repeating content types that benefit from an add-one-get-a-page pattern. It generally doesn't extend to fully custom page-level content (your About page, for instance, is usually still hand-edited directly, CMS or not).

## The practical tradeoff if a template you love doesn't have it

You can still use a non-CMS template if you genuinely don't expect to add content often (a fixed portfolio of finished work that won't grow), or if the volume is low enough that manual duplication isn't a real burden. For an actively growing blog, portfolio, or case-study collection, CMS support is worth prioritizing over other aesthetic preferences when choosing a template.

## Checking real examples

Several of [this site's free templates](/templates) — including the agency and photography portfolio templates — include CMS support as a listed feature, worth confirming directly against the live demo before you start customizing.`,
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
