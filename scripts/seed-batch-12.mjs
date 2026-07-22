import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "How to Move a Framer Site to a Custom Domain Without Losing SEO",
    excerpt: "Migrating off Framer's hosting is where rankings usually get lost — not in the move itself, but in the details most guides skip. Here's the checklist that actually protects your traffic.",
    tags: ["framer", "seo", "migration", "custom domain", "guide"],
    content: `Moving a site to your own domain and hosting is not inherently risky to SEO. What loses rankings is the small stuff that's easy to get wrong during the move — changed URLs, dropped canonical tags, missing redirects. Get those right and a migration is usually neutral-to-positive. Get them wrong and you can shed months of ranking equity overnight.

## 1. Keep every URL exactly the same

The single biggest ranking killer in any migration is changing paths. If \`/work/project-name\` on the old site becomes \`/projects/project-name\` on the new one, every link, every indexed page, and every bit of accumulated authority pointing at the old URL now points at a 404. Preserve the exact path structure, including nested routes and trailing-slash behavior. A good conversion mirrors the original URL structure automatically — verify it did before you switch DNS.

## 2. Repoint canonical tags to the new domain

Framer sites ship \`<link rel="canonical">\` tags pointing at the Framer-hosted URL. If those survive the move unchanged, you're telling Google that the *old* Framer URL is the authoritative version of each page — actively suppressing your new domain in its own search results. Every canonical needs to be rewritten to the new domain during conversion.

## 3. Set up 301 redirects if the domain actually changes

If you're moving from \`yoursite.framer.website\` to \`yoursite.com\`, add 301 (permanent) redirects from the old domain to the new one. A 301 passes the large majority of ranking signal to the destination; a 302 (temporary) or no redirect at all passes little or none. If you're keeping the same custom domain and only changing where it's hosted, you don't need redirects at all — the URLs never changed.

## 4. Don't lose your metadata in the move

Titles, meta descriptions, Open Graph tags, and structured data are ranking and click-through inputs. A conversion that captures the rendered HTML preserves these; a rebuild-from-scratch often silently drops them. Check that your top pages still have their original titles and descriptions after conversion.

## 5. Verify before and after

Before switching, crawl the converted site and confirm: every important URL resolves, canonicals point to the new domain, and titles/descriptions survived. After switching, submit the new sitemap in Google Search Console and watch the coverage report for a week. Rankings can wobble for a few days during re-crawl — that's normal and recovers.

## The short version

The converter side of this — mirroring URLs, repointing canonicals, preserving metadata, generating a sitemap — should be automatic. Our [Framer-to-Next.js and HTML converters](/) handle all four during conversion. The DNS and redirect side is yours to set up, and it's the part worth double-checking by hand. If you want a fuller walkthrough of the hosting move itself, see our [guide to self-hosting a Framer site](/guides/self-host-framer).`,
  },
  {
    title: "Do You Still Need Framer After Exporting? What Keeps Working and What Stops",
    excerpt: "Once you have your site as real code, what are you actually still paying Framer for? An honest accounting of what you keep, what you lose, and what fills the gap.",
    tags: ["framer", "ownership", "export", "subscription", "cms"],
    content: `The appeal of exporting a Framer site to code is obvious: stop paying a monthly subscription for something you designed and own. But it's worth being precise about what actually changes the moment you deploy the converted site, because "you don't need Framer anymore" is true for most of what a site does and not true for one specific thing.

## What keeps working, with no Framer involved

The deployed site itself — every page, every animation (in fidelity-preserving mode), every image, every interaction — runs entirely on your own hosting with zero dependency on Framer. If Framer changed its pricing, went down, or shut off your account tomorrow, your converted site would keep serving exactly as it does now. That's the whole point: the code is yours and it's self-contained.

## What stops: editing in Framer's canvas

The thing you genuinely give up is Framer's visual editor as *the* way to change your live site. Once the site is code on your own host, editing it in Framer's canvas no longer updates what's deployed — the two are decoupled. To change the deployed site, you either edit the code, or use whatever editing layer your conversion provides.

## The CMS question specifically

If your site uses Framer's CMS — a blog, a project list, anything driven by collections — that dynamic content is tied to Framer's backend. A conversion captures the pages *as rendered at conversion time*, but it doesn't move the CMS itself. New CMS entries you'd add in Framer won't appear on the converted site unless you re-convert. For a mostly-static marketing or portfolio site this is a non-issue; for a frequently-updated CMS-driven site, it's the main thing to plan around.

## What fills the gap

This is why a good conversion tool includes its own lightweight visual editor: so you can still change text, swap images, and update links on the deployed site without touching code or re-opening Framer. It's not a full replacement for Framer's design canvas — you're not restructuring layouts — but for the ongoing edits most sites actually need, it covers the gap. Our [converter includes exactly this kind of editor](/nextjs), working across desktop, tablet, and phone breakpoints and publishing changes live.

## The honest bottom line

For a marketing site, portfolio, or landing page that changes occasionally, exporting means you genuinely stop needing Framer — you own the code and can edit the essentials without it. For a site that's fundamentally a Framer-CMS-driven publication updated daily, exporting is more of a "snapshot and move" decision than a "cancel the subscription today" one. Know which shape your site is before you migrate.`,
  },
  {
    title: "What Happens to Your Framer Animations When You Export to Real Code",
    excerpt: "Framer animations are driven by a JavaScript runtime — so what survives export depends entirely on whether that runtime comes with them. Here's what actually happens in each case.",
    tags: ["framer", "animations", "nextjs", "export", "technical"],
    content: `Framer's animations — appear effects, scroll reveals, hover transitions, variant switches — aren't baked into the HTML. They're produced at runtime by Framer's own bundled JavaScript engine reading instructions embedded in the page. That single fact determines everything about what happens to your animations when you export, because export tools make a choice about that runtime, and the choice is the whole story.

## Option A: keep the runtime — animations are identical

If a conversion keeps Framer's runtime intact (the "pure" or fidelity-preserving approach), your animations don't change at all, because the exact same engine is still running them. Every easing curve, every stagger, every scroll-linked effect behaves byte-for-byte like the original. The tradeoff is that you're also keeping that runtime's weight — which is why this mode preserves fidelity but doesn't improve performance. We measured that tradeoff across [10 real templates here](/blog/does-converting-framer-to-next-js-make-it-faster-10-real-templates-tested).

## Option B: strip the runtime — animations get rebuilt

If a conversion strips Framer's runtime to make the page lighter and faster (the "hybrid" approach), the animations that depended on that runtime can no longer play as-is. A good converter rebuilds the common ones — appear-on-load and scroll-into-view reveals — using a lightweight CSS-plus-IntersectionObserver layer that reproduces the effect without the heavy engine. This is why hybrid mode can be dramatically faster: it's not shipping the animation runtime at all, just a tiny replacement for the effects that matter most.

## What translates cleanly, and what doesn't

The reveal-style animations — fade-up, fade-in, slide-in on scroll — rebuild faithfully, because they map naturally onto CSS transitions triggered by an intersection observer. What doesn't translate 1:1 are the effects that are genuinely runtime-driven in a way CSS can't cheaply replicate: complex physics-based motion, tightly scroll-synced parallax sequences, and elaborate multi-state interactive components. On an animation-heavy site, those are where you'd see a difference in hybrid mode.

## How to decide

If your site's animations are the point — an interactive showcase, a motion-design portfolio — keep the runtime and accept the weight (Option A). If your animations are mostly tasteful reveals and your priority is load speed, strip the runtime and let them rebuild (Option B); the difference is usually invisible and the speed gain is real. The safe move is to try hybrid first, [compare it against the original visually and on Lighthouse](/speed), and only keep the full runtime if you actually see an effect you can't live without losing.`,
  },
  {
    title: "Self-Hosting Framer Fonts: Why It Matters and What Actually Changes",
    excerpt: "Framer serves your fonts from its own CDN — which costs you a connection, some control, and a bit of speed. Here's what self-hosting them during conversion changes, and the one tradeoff to know.",
    tags: ["framer", "fonts", "performance", "self-hosting", "technical"],
    content: `Fonts are one of the quieter performance costs on a Framer site, because the cost isn't in the fonts themselves — it's in how they're delivered. Understanding what changes when a conversion self-hosts them explains a real, if modest, speed win.

## How Framer serves fonts

A published Framer site loads its fonts from Framer's font CDN (and sometimes Google's). That means the browser has to open a connection to a *separate* domain, resolve its DNS, negotiate TLS, and only then start downloading the font files — all before any text in that font can render. Each additional origin a page depends on adds this fixed round-trip cost, and fonts are render-blocking-adjacent: text using them can't paint until they arrive.

## What self-hosting changes

When a conversion downloads every font file and serves it from your own domain alongside the rest of the site, that separate-origin round trip disappears. The fonts come from the same connection already open to load the page — no extra DNS lookup, no extra TLS handshake, no dependency on a third-party CDN staying fast and available. On a site with several font weights, that's a real reduction in the critical path to first meaningful paint.

## The \`font-display\` win that comes with it

Self-hosting also puts font loading behavior under your control. A converted site can force \`font-display: swap\` on every \`@font-face\` rule, which tells the browser to render text immediately in a fallback font and swap in the real one when it loads — instead of leaving text invisible while the font downloads (the dreaded "flash of invisible text"). That's a direct Core Web Vitals and perceived-speed improvement, and it's only reliably possible once you own the font declarations.

## The one tradeoff

Self-hosting fonts means the font files now live in your deployment instead of being fetched from a shared CDN, so your own bundle is slightly larger and you don't benefit from any cross-site cache a shared CDN might theoretically provide. In practice, cross-site font caching has been largely eliminated by browsers for privacy reasons anyway (caches are now partitioned per-site), so the shared-CDN advantage is mostly theoretical today — while the extra-origin cost is real on every first visit. For most sites, self-hosting is the clear win.

## What our converter does

Both conversion modes self-host and re-encode assets during the pass — fonts included — and force \`font-display: swap\` on every face, while stripping the now-unnecessary preconnect hints to Framer's and Google's font origins. You can see the before/after effect on your own site's load behavior with the [PageSpeed comparison tool](/speed), or read how the rest of the optimization pass works on the [Pure Next.js export page](/nextjs).`,
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
