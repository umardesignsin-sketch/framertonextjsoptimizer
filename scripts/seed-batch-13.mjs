import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Framer Pricing Explained: What You Actually Pay For (2026)",
    excerpt: "Framer's pricing changed in 2026 — it's now credit-based, and a lot of blog posts about it are already out of date. Here's what each plan actually costs and includes, verified against Framer's own pricing page.",
    tags: ["framer", "pricing", "cost", "comparison"],
    content: `Framer's pricing page changes often enough that a lot of "Framer pricing explained" posts floating around are already describing an older version of the plans. Here's what's actually on framer.com/pricing right now, plan by plan, with no rounding.

## Free — $0

The Free plan is a real evaluation tier, not a stripped demo: it includes access to 10 CMS collections and up to 1,000 design pages, so you can build out a genuinely complex project before paying anything. The catch is publishing — Free sites live on a Framer subdomain with 1 GB of bandwidth, and there's no way to connect a custom domain without upgrading. It's built for exploring the tool and building templates, not for shipping a real site.

## Basic — $10/month

This is where a site actually goes live on your own domain. Basic includes a free custom domain connection, 2 CMS collections, 50 GB of bandwidth, and 30 site pages. It's aimed at personal sites, freelancers, and small single-owner projects — enough CMS and bandwidth for a real audience, but capped collections if you need more than a blog and a portfolio section.

## Pro — $30/month

Pro triples the CMS headroom (10 collections), doubles bandwidth to 100 GB, and raises the page cap to 150 (expandable up to 700 with an add-on). It also unlocks things Basic doesn't have at all: a staging environment, branching with previews, and site redirects — the features that matter once more than one person is touching the site or you're shipping changes you want to test first.

## Enterprise — custom

Custom limits, unlimited editors, SSO, SCIM, and a dedicated uptime guarantee. Priced on request, aimed at teams with compliance requirements a self-serve plan can't satisfy.

## The seat cost people forget to budget for

None of the plan prices above include collaborators. Adding another editor is **$20/month per seat** on any plan; a limited "content editor" seat (CMS, localization, and on-page editing only — no design access) is **$10/month**. Viewers are free. If you're estimating what a team of three actually costs on Framer, it's the plan price plus $20 for every additional full editor — a number that's easy to miss when you're only looking at the headline plan price.

## The part most pricing posts haven't caught up to: credits

As of 2026, every plan also includes a monthly allotment of **credits** — shared across the whole workspace, resetting each calendar month — that power Framer's AI features (Agents, and other AI-assisted tools). Free workspaces get 500 credits a day up to 1,000/month; Basic and Pro plans include configurable credit tiers you choose at signup. This is a genuinely new layer on top of the old "pick a plan, get a bandwidth limit" model, and it's worth knowing about before you assume your only cost is the plan price.

## So what does a real site cost?

For a single-owner site with a custom domain: **$10/month** (Basic) is the realistic floor — Free can't take a custom domain. For anything with a second editor or heavier CMS use: **$30/month** (Pro) plus $20 per extra full editor. Multiply either by 12 and you're looking at $120–$360+/year, indefinitely, for as long as the site exists — which is the actual number worth comparing against the alternative.

## The alternative worth knowing about

None of this is a criticism of Framer's pricing specifically — it's a normal SaaS hosting model. But it is worth knowing that a published Framer site can be converted into real, ownable code and hosted anywhere for free, permanently, with your own Netlify or Vercel account absorbing the hosting cost instead of a recurring plan fee. We cover the actual tradeoffs — what you keep, what changes — in [our manifesto](/manifesto) and on the [Pure Next.js export page](/nextjs). If you've already decided to stop paying, [here's what actually happens to the site](/blog/what-happens-if-you-stop-paying-for-framer) if you don't migrate first.`,
  },
  {
    title: "Is Framer a Website Builder? What It Actually Is (and Isn't)",
    excerpt: "Framer gets filed next to Wix and Squarespace in most \"best website builder\" roundups, but it didn't start as one — and that history still shows up in how it behaves today.",
    tags: ["framer", "website builder", "comparison", "design tool"],
    content: `Search "best website builders" and Framer usually shows up in the list next to Wix, Squarespace, and Webflow. That's not wrong, exactly, but it flattens a real distinction that matters if you're deciding whether Framer is the right tool for what you're building.

## It didn't start as a website builder

Framer began as a design and interactive-prototyping tool — a way to build realistic, clickable prototypes of interfaces before hosting or publishing were part of the picture at all. Real hosting, a CMS, custom domains, and publishing came later, layered on top of what was originally a design tool. That lineage still shows: Framer's editor thinks in terms of components, variants, and breakpoints — the vocabulary of a design tool — rather than the drag-a-block-onto-a-page metaphor Wix and Squarespace were built around from day one.

## What makes it behave differently under the hood

Classic website builders render pages through their own proprietary system. A published Framer site is different: it ships as real compiled JavaScript modules — an actual React and Motion runtime driving the page, not a static template engine. That's *why* Framer sites can have animations and interactions a traditional builder can't easily replicate, and it's also why Framer pages tend to ship meaningfully more JavaScript than a Wix or Squarespace equivalent — a real tradeoff for the interactivity, not a bug.

## Where it genuinely is a website builder today

To be fair to the "website builder" label: Framer has caught up on the fundamentals. It has CMS collections, forms, custom domain hosting, built-in SEO tools, and (as of 2026) staging environments and branching on the Pro plan — see our [full pricing breakdown](/blog/framer-pricing-explained-what-you-actually-pay-for-2026) for exact numbers. For a portfolio, a marketing site, or a small business site, it does everything a traditional builder does, and does the visual design part with more precision than most of them.

## Where it's a genuinely different category

Two things a traditional website builder doesn't ask you to think about, and Framer does:

- **A steeper learning curve.** Variants, breakpoints, and component-based design are closer to how a designer thinks in Figma than how a total beginner expects a "builder" to work. It's more capable, not more beginner-friendly.
- **Heavier pages by default.** Because it's shipping a real JS runtime to power those interactions, a Framer site typically carries more weight than an equivalent static-builder page — something worth knowing if page speed matters more to you than motion design.

## The practical answer

Framer is a website builder *and* a design tool that happens to publish real code — which is a different thing than Wix or Squarespace, even though all three end up in the same "no-code site builder" conversation. If you want the simplest possible drag-and-drop experience, a classic builder is still the better fit. If you want design precision and real interactivity and are willing to trade a learning curve and some page weight for it, Framer's the one built for that.

And because what it outputs really is code under the hood — not a proprietary format — it's also the reason a site built in it can eventually be [exported to a real, ownable Next.js project](/nextjs) instead of staying locked to one platform's hosting indefinitely.`,
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
