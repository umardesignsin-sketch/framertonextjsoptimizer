import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Does Converting Framer to Next.js Make It Faster? 10 Real Templates Tested",
    excerpt: "We converted 10 real, published Framer portfolio templates to Next.js and ran Lighthouse on both versions. The honest result surprised us.",
    tags: ["framer", "nextjs", "performance", "lighthouse", "case study"],
    content: `There's a common assumption that converting a Framer site to Next.js automatically makes it faster. We wanted an honest answer, not a marketing one, so we picked 10 real, published Framer portfolio templates — Fuel, Portfolite, Palmer, LaunchFolio, Kirk, MakOS, Miles, Portavia, Artemis, and Meeko — and ran mobile Lighthouse on both the original and a fidelity-preserving Next.js conversion of each.

## The result, unfiltered

Across all 10 templates, average mobile Performance went from 82.1 (original) to 69.8 (converted) — a real, measurable drop, not an improvement. Accessibility went the other direction: 91.3 → 94.9, improving on every single template. SEO matched exactly. Best Practices dipped slightly, traced to a separate, fixable bug (below).

One template — MakOS — actually beat its original: 85 → 98. The rest ranged from a small dip to a serious one (Fuel: 99 → 67).

## Why performance doesn't automatically improve

A conversion that keeps a site's exact runtime, animations, and interactivity intact (what we call a fidelity-preserving or "pure" export) is, by definition, still running that same JavaScript runtime — Framer's own bundled Motion/appear-animation engine, hover-state machinery, breakpoint system. Converting the *hosting* doesn't remove that weight. If a site was JS-heavy or image-heavy on Framer, it's still JS-heavy or image-heavy after conversion, just running from a different server.

The templates that dropped hardest were also the ones with the heaviest video/image payloads on the original — the conversion process doesn't and shouldn't silently degrade those assets, so the weight carries over.

## What genuinely does improve, and why

Accessibility improved on 10/10 templates because Framer's own export consistently ships four fixable gaps regardless of the source site: no \`lang\` attribute on \`<html>\`, iframe embeds with no \`title\`, no \`main\` landmark, and icon-only logo/social links with zero accessible name. These are structural gaps in how Framer generates markup, not something any individual site's designer did wrong — and they're mechanically fixable during conversion, which is why every single template we tested improved here.

## If you actually want a faster site, not just a different host

Fidelity-preserving conversion optimizes for "renders identically to the original." A separate conversion mode that strips the runtime entirely and rebuilds the page as lean static HTML is a fundamentally different tradeoff — real, large performance gains (we've measured single-page jumps from the mid-30s to the low 80s), at the cost of losing Framer's native JS-driven interactivity. Which one is right depends entirely on whether pixel-perfect fidelity or maximum Lighthouse score matters more for a given site — see our [comparison of Hybrid HTML vs Pure Next.js export](/nextjs) for the practical tradeoffs.

If you want to check where your own site lands, [convert it and compare the real PageSpeed numbers](/speed) before deciding which mode fits.`,
  },
  {
    title: "The 4 Accessibility Gaps Every Framer Export Ships With (And How to Fix Them)",
    excerpt: "Testing 10 real Framer sites, every single one had the same four accessibility issues — not from bad design, but from how Framer's export itself works.",
    tags: ["framer", "accessibility", "a11y", "seo", "technical"],
    content: `Running Lighthouse's Accessibility audit against real, published Framer sites turns up the same handful of failures again and again — not because the designers did anything wrong, but because these are structural gaps in how Framer's static export generates markup.

## 1. No \`lang\` attribute on \`<html>\`

Framer's exported HTML never sets \`<html lang="...">\`. Screen readers use this attribute to pick the correct pronunciation engine — without it, assistive technology has to guess, and often guesses wrong for non-English site content. This is a single missing attribute, and it's on essentially every Framer export we've checked.

## 2. Iframe embeds with no \`title\`

Video embeds (Vimeo, YouTube), maps, and other iframe-based content ship as bare \`<iframe src="...">\` with no accessible label. A screen reader announces an untitled iframe by reading its raw src URL — not useful, and easily fixed with a single descriptive \`title\` attribute per embed type.

## 3. No \`main\` landmark

Screen reader users rely on landmark navigation (main, nav, header, footer) to jump directly to a page's primary content instead of tabbing through every element sequentially. Framer's markup wraps the whole page in a single, un-landmarked container — meaningful content and chrome are structurally indistinguishable to assistive tech.

## 4. Icon-only links with zero accessible name

Logo links and social icon links are commonly built as an anchor wrapping a decorative SVG marked \`aria-hidden="true"\` — correct for the icon itself, since decorative graphics shouldn't be announced, but it leaves the *link* with no name at all. A screen reader user tabbing to a site's logo link hears nothing describing where it goes.

## Why this matters beyond compliance

Accessibility issues are also, mechanically, Lighthouse score deductions — meaning they affect the same audit that factors into how a site is perceived (and in some jurisdictions, legal exposure) independent of any moral argument for fixing them. In our 10-template test, fixing these four things alone lifted every single site's Accessibility score, with zero visual change to the page.

## The fix is mechanical, not manual

None of these four issues require a designer to change anything about how a site looks — they're all invisible, structural additions: a \`lang\` attribute, a \`title\` on iframes, a landmark role, and an inferred label on icon links. Our [Next.js and HTML converters](/) apply all four automatically during conversion, alongside the rest of the SEO and performance pass — worth checking your own exported site's before/after Accessibility score via our [PageSpeed comparison tool](/speed).`,
  },
  {
    title: "Pure Next.js or Hybrid HTML? A Practical Decision Guide for Framer Exports",
    excerpt: "The two export modes solve genuinely different problems. Here's how to pick based on what actually matters for your specific site.",
    tags: ["framer", "nextjs", "html", "export", "decision guide"],
    content: `Every Framer-to-code conversion tool that offers more than one output mode is really offering a choice between two different things you can optimize for — and you can't have both at their maximum at the same time. Here's the honest tradeoff.

## Pure Next.js: keep everything exactly as it was

This mode keeps Framer's actual runtime intact — its animation engine, hover states, breakpoint variants, appear effects — so the converted site renders and behaves identically to the original. You get a real, deployable Next.js project: genuine \`.tsx\` source, a real \`package.json\`, something a developer can open, read, and extend.

**What it's actually good at:** pixel-perfect fidelity, code ownership, and getting off Framer's hosting and subscription entirely while keeping a site exactly as designed. **What it's not:** a guaranteed performance upgrade — since the runtime carries over, a heavy site stays heavy. We measured this directly across 10 real templates; see [our full test results](/blog/does-converting-framer-to-next-js-make-it-faster-10-real-templates-tested).

## Hybrid HTML: rebuild for maximum Lighthouse score

This mode strips Framer's JS runtime, re-encodes and self-hosts every image as WebP, inlines fonts, and rebuilds animations using lighter CSS-based equivalents where possible. The output is static HTML with a fraction of the original JavaScript weight.

**What it's actually good at:** large, real, repeatable performance gains — we've measured single-page mobile Performance jumping from the mid-30s to the low-to-mid 80s on genuinely JS-heavy sites. **What it costs:** some of Framer's most JS-dependent interactive effects don't translate 1:1 into the lighter rebuild, so an extremely animation-heavy site may show small visual differences.

## The actual decision

Ask which failure mode you'd rather have. If a client or stakeholder would notice a subtle animation difference before they'd notice a slow load time, use Pure Next.js. If the site's whole pitch is "look how fast this loads" — an agency portfolio, a Core Web Vitals-sensitive landing page — use Hybrid.

A reasonable middle path: convert with Hybrid first, since it's non-destructive to try, [compare both against the original with real Lighthouse numbers](/speed), and only fall back to Pure Next.js for pages where the animation difference is genuinely a problem.`,
  },
  {
    title: "Why Embedding a YouTube or Vimeo Video Costs More Than You'd Think",
    excerpt: "A single embedded video iframe brings along cookies, an unload handler, and enough JS weight to move your Lighthouse score by double digits.",
    tags: ["framer", "video", "performance", "vimeo", "youtube", "technical"],
    content: `Embedding a video feels like adding one element to a page. Technically, it's importing a small application — and that application has its own cost, independent of anything the site owner controls.

## What actually loads when you embed a video

A Vimeo or YouTube embed isn't a video file with a play button — it's a full iframe pointing at that provider's own player application: their own JavaScript bundle, their own CSS, their own analytics/cookie logic, sometimes megabytes of it, loaded the moment the iframe itself loads (independent of whether the video is actually played).

## The specific costs we measured

**Third-party cookies.** The player sets its own cookies the moment it loads, which Lighthouse's Best Practices audit flags directly.

**An unload handler you don't control.** Both major video platforms' player scripts register a \`beforeunload\`/\`unload\` handler in their iframe as part of their own analytics tracking. Chrome's back/forward cache (bfcache) — which lets a browser instantly restore a page when a user hits back, instead of a full reload — refuses to cache any page containing a frame with an unload handler. This shows up as a hard bf-cache audit failure the moment the video embed loads, and there's no page-level fix for it: it's the video provider's own script doing this, not anything about how the surrounding site was built.

**It loads even when "lazy."** Native \`loading="lazy"\` on the iframe delays the request until the browser judges the element is nearly in view — but on any page long enough, or any audit that scrolls, it still loads before the page is done being evaluated. Lazy-loading defers the cost; it doesn't remove it.

## What you can actually do about it

Use a real click-to-play facade — a static thumbnail with a play button that only injects the actual iframe on click. This is the standard, correct pattern, but it's worth verifying it actually works after your specific export or CMS: we found, testing our own converter's implementation, that some site frameworks' own runtime will silently detect the "missing" video component and reconstruct a live iframe anyway, defeating the facade without any visible symptom. Test by loading the page fresh and checking the network tab for player requests before assuming a facade is working.

If a video is genuinely essential above the fold, accept the bf-cache and cookie cost as the price of that specific choice — it's a real cost, but it's Vimeo's or YouTube's, not something a conversion or export process introduces or can fully remove while keeping the video functional.`,
  },
  {
    title: "How Next.js's App Router Can Silently Double Your Page Weight",
    excerpt: "A real, measured example of App Router's biggest hidden cost for content-heavy pages, and when it matters enough to avoid.",
    tags: ["nextjs", "app router", "performance", "rsc", "technical"],
    content: `This is a genuinely under-discussed Next.js App Router behavior, and we hit it directly building a converter that turns full HTML documents into Next.js output.

## The setup

Next.js's App Router supports React Server Components, and every \`page.tsx\` route gets client-side navigation support baked in automatically — click a \`next/link\` anywhere on the site, and Next.js can swap in the new page's content without a full browser reload. To make that instant, App Router embeds a serialized copy of a page's own rendered content into the initial HTML response, as a hidden JSON payload the client-side router can read from immediately.

## Where this becomes a real cost

For a typical app page — a few components, some text, some data — this payload is small and the tradeoff is clearly worth it. For a page whose actual content is a large amount of raw HTML (a scraped or migrated page, a CMS-rendered document, anything in that shape), that same mechanism serializes the *entire rendered page a second time* as an escaped JSON string embedded in the first response.

We measured this directly: the same page, same assets, same everything, served as a real \`page.tsx\` versus a plain Route Handler returning identical HTML. Mobile Performance: 36 vs 81. Cumulative Layout Shift: 0.947 (the worst possible score) vs 0.016. The only variable that changed was which Next.js primitive served the response.

## Why it doesn't show up in typical guidance

Most Next.js performance advice is written for pages built from normal-sized React component trees, where this payload duplication is negligible. It only becomes visible at the specific intersection of "App Router page.tsx" and "a large amount of pre-rendered HTML content" — an intersection most apps never hit, but content migration, static-site generation, and CMS-heavy use cases hit constantly.

## The practical takeaway

If a Next.js page's content is genuinely large (tens of KB or more of markup) and doesn't need client-side soft navigation — no \`next/link\`, no shared layout transitions — a Route Handler (\`route.ts\`) serving the same HTML directly sidesteps this entirely, since Route Handlers never enter App Router's page/hydration pipeline at all. It's a less commonly reached-for tool than \`page.tsx\`, but for this specific shape of content, it's the right one.`,
  },
  {
    title: "Why Your Converted Site's Lighthouse Score Depends on Where You Deploy It",
    excerpt: "The exact same converted files can score meaningfully differently on Netlify versus Vercel versus a local test — here's why, and what to actually trust.",
    tags: ["lighthouse", "hosting", "netlify", "vercel", "performance", "technical"],
    content: `Two people can convert the identical site, deploy the identical files, and land on genuinely different Lighthouse scores — not because either conversion was wrong, but because of how the specific host serves those files.

## Response size limits you won't hit until you do

Vercel caps a serverless function's response body at 4.5MB — a hard platform limit, not a Next.js setting. A static site with modest, well-optimized images never approaches this. A site with 100+ self-hosted images can genuinely exceed it if served through a function response rather than a true static file server, which silently breaks the request rather than degrading gracefully. This is a real failure mode we hit directly and fixed by switching to a streamed response instead of a buffered one.

## Local testing vs. a real CDN

Testing a converted site with \`next start\` on your own machine measures something meaningfully different from a real Vercel or Netlify deployment: no real CDN edge caching, no HTTP/2 multiplexing tuned the way a production host configures it, and your own machine's CPU is doing double duty running both the server and the Lighthouse audit simultaneously. We've seen the same build score noticeably lower locally than the same build deployed for real — local testing is a useful lower bound, not a reliable final number.

## Static hosting vs. real framework hosting

A fully static HTML bundle (no server-side code at all) and a real Next.js project deployed with its own build step are genuinely different hosting shapes, even when the visual output is identical. A real Next.js deployment carries some inherent framework overhead a pure static file doesn't — usually small, but worth knowing which one you're actually testing before comparing numbers to a purely static competitor's site.

## The practical rule

Don't trust a single Lighthouse run, and don't trust a local test as your final number. [Run PageSpeed Insights](/speed) against the actual, real, publicly deployed URL — not a preview link, not localhost — and run it more than once, since network conditions add real variance between runs. That's the only number worth actually comparing against the original.`,
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
