import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "How Framer's Appear Animations Actually Work Under the Hood",
    excerpt: "A real look at the framer/appear script format, the opacity: 0.001 convention, and why this is the one interaction that survives a static export intact.",
    tags: ["framer", "technical", "animations", "appear"],
    content: `Most explanations of Framer's animation system stay at the surface level — "scroll reveals fade elements in." Here's what's actually happening in the markup, because it explains both why appear animations are recoverable and why almost nothing else in Framer's interaction system is.

## The data structure

Every server-rendered Framer page that uses scroll/appear animations includes one or more \`<script type="framer/appear">\` blocks. Inside is JSON, keyed by a per-element appear ID, that looks roughly like this shape: an \`initial\` state, an \`animate\` (target) state, and a \`transition\` spec. The transition can be a duration/easing pair, or full spring parameters — mass, stiffness, damping (expressed as "bounce" in some versions), and delay. This is the actual, authored animation data from whoever designed the site — not a runtime computation, not an approximation.

## Why opacity starts at 0.001, not 0

This one trips people up. Framer deliberately initializes hidden elements to \`opacity: 0.001\` instead of \`0\`. It's not a bug — it's a convention that keeps the element technically "visible" to certain browser heuristics (layout, some accessibility and rendering paths) while being visually imperceptible, avoiding edge cases that a hard \`0\` can trigger in some engines. If you ever see this value in a Framer page's inline styles, that's the signal: this element has an appear animation and starts hidden.

## Why this is recoverable and hover/tap animations aren't

The critical difference: appear animation data is serialized into the page's HTML *before* any JavaScript runs, because Framer needs the correct initial state to exist for the very first paint (otherwise you'd see a flash of the wrong state). Hover and tap animations have no equivalent requirement — nothing needs to know the hover state before you've actually hovered, so Framer never serializes it anywhere. It only exists as logic inside the runtime bundle, computed live.

This is the whole reason a Framer-to-static-HTML converter *can* faithfully rebuild scroll-reveal animations (the data is right there in the source) but generally *can't* faithfully rebuild hover states (the data was never written down anywhere outside the runtime) without a separate tool that actually drives the live site and records real interaction deltas.

## What a correct reconstruction looks like

Parse every \`framer/appear\` script from the raw page response (not a second, separate fetch — the appear-ID hashes need to match the exact document they came from). Map initial/animate/transition per element. Rebuild with a real animation library — Framer Motion is the natural match since it's built by the same underlying team and shares the same spring-physics model. Trigger on scroll-into-view with an IntersectionObserver matching Framer's own \`once\` semantics.

Done correctly, this is one of the only Framer interactions a runtime-free export can reproduce with genuine, authored-value fidelity rather than an approximation.`,
  },
  {
    title: "Setting Up Google Analytics After Exporting a Framer Site",
    excerpt: "Framer's built-in analytics doesn't travel with an export. Here's exactly how to wire up GA4 (or another provider) on your new hosting.",
    tags: ["framer", "analytics", "google analytics", "export", "seo"],
    content: `Framer includes its own basic analytics for published sites, but that data — and the tracking itself — is tied to Framer's hosting. Once you export and move to your own domain/hosting, you need to set up tracking independently.

## Why this doesn't carry over automatically

Framer's analytics script is part of its runtime, loaded from Framer's own infrastructure. A runtime-stripped export removes it along with everything else Framer-specific — correctly, since you don't want a tracking script phoning home to a platform you're leaving. But it means day one on your new hosting has zero analytics until you add your own.

## Setting up Google Analytics 4

1. Create a GA4 property in Google Analytics if you don't already have one, and grab your Measurement ID (starts with \`G-\`).
2. Add the GA4 tag to your site. For a static HTML export, that's the standard \`gtag.js\` snippet dropped into the \`<head>\` of every page (or a single shared layout file, if your export structure has one). For a Next.js export, this is typically a single script added to your root layout, so it applies site-wide without touching every page.
3. Verify it's firing — GA4's Realtime report is the fastest check: open your live site in another tab, watch for your own visit to register within a few seconds.
4. Set up conversion events for anything that actually matters to the business — form submissions, key button clicks — rather than relying on pageviews alone.

## Don't forget these while you're in there

- **Search Console** — verify your new domain (or the new hosting URL, if you kept the same domain) as a fresh property if you don't already have it verified, so you can monitor indexing and search performance going forward.
- **A sitemap** — make sure one exists and is submitted, especially important right after a migration when you want Google to re-crawl efficiently rather than discover pages slowly through normal crawling.
- **Any existing UTM-tagged campaigns or backlinks** pointing at your old Framer URL — if your domain changed as part of the move, a redirect strategy matters for not losing that traffic and link equity.

Analytics continuity is one of the easiest things to forget in a platform migration, precisely because the old dashboard doesn't send you an alert saying "you have zero visibility now" — it just quietly stops being useful.`,
  },
  {
    title: "Framer Breakpoints Not Rendering Correctly After Export? Here's Why",
    excerpt: "Framer bakes multiple responsive variants into one page and toggles them with CSS classes. A common export bug shows the wrong one at the wrong width.",
    tags: ["framer", "html", "troubleshooting", "responsive", "breakpoints"],
    content: `If your exported Framer site shows the desktop layout on mobile (or vice versa), or a component looks visually broken at a specific width, the cause is almost always in how Framer structures responsive variants — not a rendering bug in your new hosting.

## How Framer actually handles breakpoints

Rather than one fluid layout, Framer typically server-renders *every* breakpoint variant of a component into the same page — desktop, tablet, phone versions all present in the DOM simultaneously — and uses CSS classes (commonly prefixed something like \`hidden-\` plus a hash) combined with media queries to show only the one matching the current viewport. This is different from how most hand-coded responsive CSS works, where you have one layout that reflows with breakpoints, not multiple parallel layouts that swap visibility.

## Why this breaks in some exports

A few specific failure patterns we've run into:

- **The CSS driving those \`hidden-*\` classes gets stripped or reordered** during optimization, leaving multiple breakpoint variants visible simultaneously (a layout that looks doubled-up or overlapping), or none of them visible at all.
- **Class names get renamed** by an optimizer trying to shrink output size, without correspondingly updating the CSS selectors targeting them — silently breaking the visibility toggle entirely.
- **JavaScript-driven variant detection gets removed** without a fallback, for components that use script (not just CSS media queries) to pick a breakpoint — this shows up as a component stuck on whatever variant happened to be first in the DOM, regardless of actual viewport width.

## How to check if this is what's happening to you

Open your exported site, resize the browser window slowly through common breakpoints (roughly 480px, 768px, 1024px, 1280px), and watch for: content that doesn't change at all when it should, content that flickers between two states, or elements that are clearly present twice (one on top of the other, or one pushing the other down unexpectedly).

## The fix

The safe rule for any Framer export tool: never rename Framer's generated CSS class names. It's tempting to want cleaner, human-readable class names in exported output, but Framer's own CSS (including every breakpoint-visibility rule) is written against those exact original names — renaming them without perfectly rewriting every corresponding selector is one of the highest-risk changes you can make to visual fidelity, and breakpoint-swap bugs are one of the most common symptoms when it goes wrong.`,
  },
  {
    title: "Framer Sitemap and Robots.txt After You Export or Migrate",
    excerpt: "Your old Framer sitemap won't follow you to a new domain or host. Here's what to regenerate and resubmit so search engines don't lose track of your site.",
    tags: ["framer", "sitemap", "robots.txt", "seo", "export"],
    content: `A sitemap and robots.txt are small files with an outsized effect on how quickly search engines notice and correctly index a site that's just moved — and they're easy to forget entirely during a Framer export or migration.

## What Framer provides by default

Framer auto-generates a basic sitemap.xml and robots.txt for published sites, pointing at your Framer-hosted URLs. That's fine while you're on Framer's hosting — but once you export and move to a new domain or a different hosting provider (even on the same domain), those generated files either don't exist anymore or still point at the old URLs, which is actively unhelpful.

## What to actually set up post-migration

**A fresh sitemap.xml** listing every real route on your new hosting, with correct \`<loc>\` URLs matching your live domain. If your export tool doesn't generate one automatically, this is straightforward to build from your route list — one \`<url>\` entry per page.

**A robots.txt** that references your new sitemap location and doesn't accidentally block anything you want crawled (a leftover \`Disallow: /\` from a staging setup is a classic self-inflicted SEO wound — always double check this after any migration).

**Resubmission in Search Console.** Even with a correct sitemap live, submitting it explicitly in Google Search Console (Sitemaps section) speeds up discovery rather than waiting for organic re-crawling.

## If your domain changed too

This is the higher-stakes version of the same problem. If you moved from a Framer subdomain (or even your custom domain, if the hosting stack changed enough to affect canonical URLs) to a genuinely new domain, you also need:

- 301 redirects from old URLs to new ones, wherever technically possible
- A Change of Address submission in Search Console, if it's a true domain change
- Patience — a domain migration typically takes Google several weeks to fully re-associate ranking signals with the new domain, even with everything done correctly

## The one-line takeaway

Treat sitemap/robots.txt as part of the migration checklist, not an afterthought — they're the mechanism search engines use to efficiently discover that anything changed at all, and skipping them doesn't break your site visually, which is exactly why it's easy to miss until organic traffic quietly drops a few weeks later.`,
  },
  {
    title: "Framer Custom Fonts: What Survives Export and What Doesn't",
    excerpt: "Framer loads most fonts from its own CDN. Here's what happens to font rendering after export, and how to self-host fonts correctly.",
    tags: ["framer", "fonts", "export", "html", "performance"],
    content: `Font handling is one of the more mechanical parts of a Framer export, but getting it wrong shows up immediately and visibly — text rendering in a fallback system font instead of your actual design.

## Where Framer loads fonts from

Most Framer sites reference fonts hosted on Framer's own CDN (or, for Google Fonts specifically, Google's CDN directly) rather than bundling font files into the page itself. That works fine while you're on Framer's hosting — the references resolve correctly — but a runtime-stripped export needs to handle those references deliberately, or you end up with \`@font-face\` rules pointing at URLs that either don't work outside Framer's context or add an unnecessary external dependency you were trying to remove in the first place.

## What a correct export does

Self-hosts the actual font files. That means downloading each referenced font (respecting the license — most fonts used on Framer are either open licenses like Google Fonts or ones you've legitimately licensed for your project), placing them alongside your exported assets, and rewriting the \`@font-face\` \`src\` URLs to point at your own hosting instead of Framer's or Google's CDN.

## Why self-hosting fonts matters beyond "no external dependency"

**Performance.** An external font CDN request means an extra DNS lookup and connection before that text can render — self-hosted fonts load from the same origin as everything else, which is measurably faster, especially on mobile networks.

**Reliability.** If Framer's CDN (or the specific font provider) ever has downtime, a self-hosted font isn't affected — one less external dependency in your critical rendering path.

**Consistency.** No risk of a font provider changing or deprecating a font URL months after your export, silently breaking typography on a site you're no longer actively maintaining in an editor.

## How to check your own export

Open dev tools → Network tab, filter by font file types (woff2/woff/ttf), and reload your exported site. Every font request should be coming from your own domain. If you see requests going out to \`framerusercontent.com\` or an external font CDN, those weren't properly self-hosted — worth flagging to whatever tool produced the export, since it's a straightforward, mechanical fix once identified.`,
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
