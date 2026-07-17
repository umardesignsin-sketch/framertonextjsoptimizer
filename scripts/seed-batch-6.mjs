import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Framer to Astro: Is It Worth the Migration?",
    excerpt: "Astro is built for exactly the kind of content-heavy, low-interactivity site Framer often produces. Here's when that migration makes sense.",
    tags: ["framer", "astro", "migration", "nextjs"],
    content: `Astro comes up often in Framer migration conversations because its whole design philosophy — ship close to zero JavaScript by default — is the direct answer to Framer's biggest performance criticism: a heavy runtime shipped to every visitor.

## Why Astro specifically fits this use case

Most marketing sites, portfolios, and content sites built in Framer are mostly static — text, images, layout, maybe a few scroll animations. They don't need a full client-side JavaScript framework running on every page load. Astro's "islands" architecture ships plain HTML/CSS by default and only sends JavaScript for the specific interactive pieces that actually need it. For a Framer site whose interactivity is mostly appear/scroll animations (which can be reproduced with lightweight CSS + IntersectionObserver, no framework required), that's a strong architectural match.

## Astro vs a Next.js export for this use case

Both are legitimate landing spots for an exported Framer site, and the right choice depends on what you're optimizing for:

- **Astro** wins on raw performance for content-heavy, low-interactivity sites — less JS shipped by default means faster Time to Interactive almost automatically.
- **Next.js** wins if you want a broader ecosystem, more first-party integration with things like Vercel's platform features, or you anticipate the site growing more interactive/app-like over time (Astro can do interactivity too, but Next.js's model is more naturally suited to it).

For a typical marketing site with scroll animations and not much else, Astro's performance ceiling is genuinely higher. For a site that might grow real app-like features later, Next.js avoids a second migration.

## What the actual migration involves

There's no automated "Framer to Astro" converter in wide use the way there are Framer-to-HTML and Framer-to-Next.js tools — because Astro's component model (\`.astro\` files) is different enough from either raw HTML or JSX that a direct 1:1 conversion isn't as mechanical. The practical path is usually: export to clean static HTML first (stripping Framer's runtime, self-hosting assets), then restructure that HTML into Astro components and pages — meaningfully more manual work than a Next.js export, but landing you on the leanest possible output.

## The honest recommendation

If raw performance is your single top priority and you're comfortable with some manual restructuring work, Astro is worth it. If you want the fastest path from "published on Framer" to "deployed somewhere I control" with the least manual effort, a direct Next.js or static HTML export gets you there today without the extra restructuring step.`,
  },
  {
    title: "From Figma to Framer to Next.js: The Full Pipeline Explained",
    excerpt: "A lot of teams design in Figma, prototype and publish in Framer, then need real code eventually. Here's how that whole pipeline actually connects.",
    tags: ["figma", "framer", "nextjs", "workflow", "design to code"],
    content: `Figma → Framer → Next.js is a genuinely common real-world pipeline, and understanding where each handoff point actually loses or preserves fidelity helps you plan the whole workflow instead of hitting surprises at the last step.

## Figma to Framer

Framer's import from Figma is one of its most-used features, and it's reasonably faithful for static layout — Framer reads Figma's layer structure, styles, and positioning and translates it into its own component model. What doesn't come across automatically: Figma prototyping interactions (Figma's own click-through prototype links) don't map directly to Framer's interaction system — those need to be rebuilt using Framer's own variants and triggers once the design lands there. Treat the Figma import as "the static design arrived," not "the whole prototype arrived."

## Framer to published site

This part is Framer doing what it's built for — the imported design becomes a real, hosted, responsive website with Framer's animation and interaction system layered on top of whatever you built or refined directly in Framer's editor.

## Published Framer site to Next.js

This is the step most of this pipeline conversation is really about, and it's where the tradeoffs from earlier steps compound. If your Framer design leans heavily on custom interactions built in Framer's editor (not just appear animations), be aware going in that a code export will reproduce appear/scroll animations with high fidelity, but hover/tap/click-triggered interactions are harder to recover faithfully — see our deep dive on why Framer hover effects break after export for the technical reason.

## Planning the pipeline end to end

If you know from the start that this design is eventually going to code, a few decisions early on save real pain later:

- **Keep interactions simple where possible** if code-fidelity matters more than in-Framer polish — heavy reliance on custom Framer interactions is exactly what's hardest to carry through to code faithfully.
- **Decide your export target early** (Next.js JSX vs a runtime-intact wrapper) — it affects how much you should invest in refining interactions inside Framer's editor versus planning to rebuild them directly in code later anyway.
- **Budget real QA time after the final export step** — verify every interactive element manually rather than assuming a conversion tool caught everything, since the earlier stages of this pipeline (especially heavy custom Framer interactions) are exactly where fidelity risk concentrates.`,
  },
  {
    title: "Is a Framer Site Accessible? What Export Changes (and Doesn't)",
    excerpt: "Accessibility issues in a Framer site are mostly authored, not platform-caused — but export can genuinely help or hurt specific things. Here's what to check.",
    tags: ["framer", "accessibility", "a11y", "export", "seo"],
    content: `Accessibility gets less attention in Framer migration conversations than performance or SEO, but it matters for real users and increasingly for legal compliance — worth understanding what actually changes when you export.

## What's mostly unaffected by export

Semantic structure — proper heading hierarchy, meaningful alt text on images, logical reading order — is largely determined by how the site was originally built in Framer's editor, not by the export process. If your Framer site has accessibility gaps today (missing alt text, skipped heading levels, poor color contrast), a straightforward export carries those same gaps forward unchanged. Export tooling generally isn't in the business of rewriting your content structure.

## What export can genuinely improve

**Reduced motion respect.** A thoughtful export can add support for \`prefers-reduced-motion\`, disabling or simplifying animations for users who've set that OS-level preference — something worth checking whether your original Framer site or its export handles at all, since it's easy to miss either way.

**Keyboard navigation on rebuilt interactions.** If a mobile menu or other interactive element gets rebuilt from scratch during export (common for elements Framer's runtime built dynamically that a static export needs to reconstruct), that's a chance to make sure the rebuilt version is genuinely keyboard-navigable and has correct ARIA attributes — or a risk of making it worse, if the reconstruction only handles mouse/touch interaction and forgets keyboard entirely.

**Removing runtime overhead** can indirectly help — a faster, less JavaScript-heavy page is generally easier for assistive technology to process reliably, especially on lower-end devices.

## What can go wrong during export if you're not careful

A poorly-implemented custom mobile menu reconstruction (see our post on Framer mobile menus after export) that only wires up click events and ignores keyboard/focus management would be a real accessibility regression versus Framer's own (imperfect, but existing) implementation.

## A practical post-export accessibility check

- Tab through your entire site using only the keyboard — can you reach and activate every interactive element, including any rebuilt menu?
- Run an automated scanner (axe DevTools, Lighthouse's Accessibility audit) on the exported site and compare the score against the original Framer-hosted version.
- Verify \`prefers-reduced-motion\` is respected if your site has meaningful animation.

Accessibility isn't automatically better or worse after a Framer export — it inherits your original site's baseline, plus whatever the export process specifically touches. Worth a deliberate check rather than an assumption either way.`,
  },
  {
    title: "Framer Password Protection: What Happens After You Export",
    excerpt: "Framer's page password protection is a hosted feature. Here's what actually replaces it if you export a protected page.",
    tags: ["framer", "password protection", "export", "security"],
    content: `If part of your Framer site uses page-level password protection — a client preview area, a private portfolio section — exporting requires actually thinking through how that protection gets replaced, since it doesn't come along automatically.

## Why it doesn't survive a static export

Framer's password protection is enforced server-side, as part of Framer's hosting — a request for a protected page checks credentials before the content is served. A static HTML export is, definitionally, just files — there's no server-side gate built into plain static hosting to check a password against before serving a file.

## What actually replaces it, by export type

**Static HTML export:** You'll need hosting-level protection instead of page-level. Most static hosts (Netlify, Vercel, Cloudflare Pages) support HTTP Basic Auth or similar access controls at the deployment level — coarser than Framer's per-page protection (it typically protects the whole deployment or a whole directory, not one specific page among many public ones), but functional for a genuinely private section.

**Next.js export (runtime-intact):** If your export keeps Framer's actual runtime running, password protection may continue working as before, since it's the same underlying mechanism — worth explicitly testing rather than assuming, since this depends on exactly how the export wraps the original page.

**Next.js export (JSX/code-based):** You'd implement your own auth check — even something simple like a middleware function checking a password against an environment variable before serving that specific route — genuinely more setup than Framer's built-in toggle, but gives you precise, per-page control rather than protecting an entire deployment.

## The realistic recommendation

If you only need to protect one or two pages and the rest of the site should stay fully public, a Next.js export with a small custom auth check on just those routes is the most precise fit. If the entire section you're exporting is meant to be private (a whole separate portfolio subdirectory, say), hosting-level Basic Auth on that specific deployment is the fastest to set up correctly.

Either way — test the protected page specifically after any export. It's exactly the kind of thing that's easy to overlook while checking that the public pages all look right, and the failure mode (a "private" page that's actually now publicly accessible) is a genuinely bad one to discover late.`,
  },
  {
    title: "Framer Core Web Vitals: A Practical Guide",
    excerpt: "LCP, CLS, and INP are the three metrics that actually matter for ranking and user experience. Here's how a typical Framer site scores, and why.",
    tags: ["framer", "core web vitals", "seo", "performance", "lcp"],
    content: `Core Web Vitals are the specific performance metrics Google factors into ranking, and they're worth understanding individually rather than just chasing a single Lighthouse score — because each one has a different, specific cause.

## Largest Contentful Paint (LCP) — how fast the main content appears

Measures when the largest visible element (usually a hero image or heading) finishes rendering. On a typical Framer site, LCP is commonly held back by: an unoptimized hero image (wrong format, oversized for its display dimensions), font loading from an external CDN adding a connection round-trip before text can render in the correct typeface, or render-blocking JavaScript delaying paint. Good target: under 2.5 seconds.

## Cumulative Layout Shift (CLS) — how much the page jumps around while loading

Measures unexpected layout movement as a page loads. Framer sites are usually reasonably disciplined here since the editor generally reserves space for elements — but a common culprit when CLS is bad is images or embeds without explicit dimensions, causing surrounding content to jump once the resource finishes loading and its actual size is known. Good target: under 0.1.

## Interaction to Next Paint (INP) — how responsive the page feels to actual clicks/taps

Measures the delay between a user interaction and the page visibly responding. This is where Framer's runtime weight shows up most directly — a heavier JavaScript bundle means more main-thread work competing with your click/tap handler, which can measurably delay the page's response even on a device that's not obviously struggling. Good target: under 200ms.

## What a runtime-stripped export typically improves

Removing Framer's JS runtime directly helps INP (less competing main-thread work) and often LCP (less render-blocking script). Self-hosting images and fonts helps LCP specifically. CLS is largely unaffected by export itself, since it's mostly a content-authoring concern rather than a platform overhead one — if your original Framer site had CLS issues, they typically carry through unless explicitly addressed.

## How to actually check yours

Don't rely on lab data alone (Lighthouse) — check PageSpeed Insights for real-world "field data" from actual visitors (the CrUX report), where available for your domain. Lab and field data can diverge, and field data is what actually factors into ranking. If your site doesn't have enough traffic for field data yet, lab data from Lighthouse is the next best signal, run on your actual live URL rather than a local preview.`,
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
