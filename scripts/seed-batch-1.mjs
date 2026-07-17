import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Why Framer Hover Effects Break After You Export to HTML",
    excerpt: "Framer's hover states are driven entirely by its client-side runtime, not CSS — here's exactly why a static export loses them, and what actually recovers them.",
    tags: ["framer", "html", "troubleshooting", "hover", "export"],
    content: `Most Framer-to-HTML exports lose hover effects, and it's not a bug in the exporter — it's a structural property of how Framer builds them in the first place.

## The short answer

Framer doesn't implement hover states with CSS \`:hover\` rules the way a hand-coded site would. Instead, its runtime attaches JavaScript event listeners to elements and computes style changes on the fly — reading the "before" computed style, the "after" state defined in the component variant, and animating between them with a spring or tween. None of that logic lives in the page's static HTML or CSS. It only exists inside Framer's minified JS bundle, which a static export strips out (correctly — that bundle also pulls in Framer's CDN dependency, analytics, and hundreds of KB of runtime weight you're trying to get rid of).

So when a converter promises "pixel-perfect HTML export," and the hover states go dead, that's the tradeoff surfacing: no runtime, no runtime-computed behavior.

## What we found reverse-engineering it

We went looking for exactly how much of this is really recoverable. Inspecting a real Framer site's DOM under an active hover, the pattern is consistent: Framer stacks a "Main" text/icon layer and a "Hover" layer in the same component, and on hover it animates a transform (commonly a \`translateY\`) to swap which one is visually in view — sometimes with a spring, sometimes a tween, always driven by JS, never by a CSS \`transition\`. We checked systematically: across a real site's hover interactions, zero of them had an actual CSS \`transition-duration\` captured — confirming this is JS/spring-driven, not CSS-driven, effectively everywhere.

## What actually works

Two honest options, depending on what "export" means to you:

1. **Keep Framer's runtime intact.** If the export wraps and serves the original page (assets on Framer's CDN, JS bundle untouched), every hover effect works exactly as authored — because it's genuinely the same code running. The tradeoff is you're not fully independent of Framer's CDN.
2. **Reconstruct hover behavior from captured runtime data.** A tool that actually drives the live site in a real browser, hovers every interactive element, and records the exact computed style delta (not just the static HTML) can rebuild real CSS \`:hover\` rules with the true before/after values — closer to the original than guessing, but still an approximation of spring physics with CSS easing.

What doesn't work: parsing the static HTML/CSS alone. There's nothing there to recover — the data legitimately doesn't exist outside the runtime.

## Quick check for your own site

Open dev tools, hover a link that visually changes, and watch the Styles panel. If you see a \`transition\` property with a nonzero duration, it might survive a stripped export. If you see the transform jump instantly to a new matrix value with no transition line, it's runtime-driven and will need one of the two approaches above.`,
  },
  {
    title: "Framer Scroll Animations Not Working After Export? Here's the Real Cause",
    excerpt: "Appear and scroll-reveal animations look identical in Framer's own SSR HTML — the data is actually there. Most exporters just don't read it correctly.",
    tags: ["framer", "html", "nextjs", "troubleshooting", "animations", "scroll"],
    content: `This one has a happier ending than most Framer export problems: scroll-reveal ("appear") animations are one of the few interactions Framer genuinely ships in a recoverable, static format — a lot of exports just fail to use it correctly.

## Where the data actually lives

Framer's server-rendered HTML includes a \`<script type="framer/appear">\` block per animated element, containing real authored animation data: initial state (usually \`opacity: 0.001\` — a deliberate near-zero marker, not a bug), the target animate state, and a full transition spec — duration, easing curve, or spring parameters (mass, stiffness, damping/bounce). This is the actual data Framer's designer set when they configured the animation, not a runtime computation. It's sitting right there in the page source before any JavaScript runs.

## Why exports still lose it

A few common failure modes we've run into:

- **The export strips the appear script along with the rest of Framer's runtime**, without first reading the data out of it — so the animation state (elements permanently stuck at \`opacity: 0.001\`) survives, but nothing ever triggers the transition to full opacity. Content silently vanishes.
- **A second, independent fetch for animation data doesn't match the fetch used for the page HTML.** Framer's appear-id hashes need to come from the exact same response as the DOM they're mapped to — fetching the animation data separately risks a mismatch that silently produces zero working animations.
- **The reveal trigger (scroll into view) isn't reimplemented at all**, so even correctly-extracted data has nothing to fire it.

## What a correct implementation looks like

1. Parse the \`framer/appear\` script(s) from the *same* HTML response used to build the rest of the page — never a second, separate request.
2. Map each element's \`data-framer-appear-id\` to its initial/animate/transition spec.
3. Reproduce it with a real animation library that supports spring physics (not just CSS cubic-bezier approximations) — Framer Motion is the natural fit since it's the same physics engine family.
4. Trigger on scroll-into-view with an IntersectionObserver, matching Framer's own \`once\`/threshold behavior.
5. Add a defensive sweep for edge cases IntersectionObserver can legitimately miss — elements nested inside \`position: sticky\` ancestors are a known one, where the observer's relationship with the pinned ancestor doesn't always fire the way a plain scrolling element would.

## How to tell if your export got this right

Inspect an element that should fade/slide in on scroll. If its inline style still shows \`opacity: 0.001\` after you've scrolled it into view and waited a couple seconds, the extraction step is either missing or mismatched — that's permanently hidden content, not a subtle bug.`,
  },
  {
    title: "Framer Mobile Menu Broken After Converting to HTML or Next.js",
    excerpt: "The open-state panel of a Framer mobile nav often doesn't exist anywhere in the static HTML — here's why, and what a working replacement looks like.",
    tags: ["framer", "html", "nextjs", "troubleshooting", "navigation", "mobile"],
    content: `If your converted site's hamburger menu does nothing when tapped, you've hit one of the more structurally confusing Framer export problems — and the fix isn't obvious from the DOM alone.

## The core issue: the "open" state doesn't exist yet

Framer's mobile nav is typically a component with responsive breakpoint variants (desktop/tablet/phone) *and* interaction-driven state variants (closed/opened). The static, server-rendered HTML only ever contains the **closed** state. The full-screen open panel — the one with your actual nav links laid out large — is built by Framer's client runtime the moment you click the trigger. Before that click, it genuinely does not exist anywhere in the page source. We confirmed this directly: querying a freshly-loaded page's DOM for the open-state panel by name returns nothing at all, before any interaction.

That means no amount of clever static HTML parsing will ever recover it — there's nothing to parse.

## A second, sneakier problem: finding the trigger

Even once you accept you'll need to build the open panel yourself, you still need to correctly detect *what to click*. A lot of Framer sites don't name their hamburger icon container anything obviously related to "menu" — it's just as likely to be named after a visual state ("Dark closed", "Light opened") as anything semantic. Matching on the word "menu" alone misses a meaningful share of real sites.

A far more reliable signal: Framer's hamburger icon is almost always two or three small stacked "Line" elements (the bars), inside a small, currently-visible container near the top of the page. That structural fingerprint holds up across naming conventions that "look for the word menu" doesn't.

## What actually works

Since the real open-panel markup can't be recovered, the practical fix is to build an equivalent panel from data that *does* exist statically: the real navigation links, which are present in the page (just hidden behind a CSS breakpoint at narrow widths). Concretely:

1. Find the trigger via the Line-bar-count fingerprint above, not just name matching.
2. Collect every real \`<a href>\` inside the site's nav, deduped by URL (watch out — Framer often renders a "Main" and "Hover" text copy of the same link inside one \`<a>\`, which will double up your label text if you naively grab \`.textContent\`).
3. Build a simple full-screen overlay with those links and wire it to the trigger.

It won't be a pixel-identical animation of Framer's own transition, but it's a genuinely working menu with your real links — which beats a hamburger icon that silently does nothing.

## If you're keeping Framer's runtime instead

None of this applies if your export keeps Framer's actual JS running rather than reproducing behavior. In that case the real menu works exactly as authored, because it's the same code — this whole problem only exists for exports that strip the runtime.`,
  },
  {
    title: "Do Framer Forms Work After You Export the Site?",
    excerpt: "Framer's built-in form component submits to Framer's own backend. Exporting the HTML doesn't take that backend with it — here's what breaks and how to fix it.",
    tags: ["framer", "html", "forms", "troubleshooting", "export"],
    content: `This is one of the most commonly missed gotchas in any Framer export, because the form usually still *looks* completely normal after conversion — it just quietly stops working.

## Why it breaks

Framer's native form component doesn't post to a URL you control. It submits to Framer's own hosted backend, which handles spam filtering, email notifications, and (on paid plans) integrations like Zapier or Notion. That backend is part of Framer's hosting, not part of the page. When you export static HTML or wrap the page in your own Next.js project, you get the form's markup — inputs, labels, the submit button — but the endpoint it used to post to is gone. Submit it, and it either silently does nothing or throws a network error, depending on how the export handled the missing endpoint.

## How to actually fix it

You need to point the form at something that's actually yours. The realistic options, roughly in order of effort:

- **A form-as-a-service provider** (Formspree, Basin, Getform, Web3Forms) — swap the form's \`action\` to their endpoint, keep every field name the same, done in a few minutes. This is the right call for almost everyone.
- **A serverless function you own** (a Vercel/Netlify function, or a Next.js API route if you exported to Next.js) — more control, more setup, worth it if you need custom logic (writing to a database, calling your own CRM).
- **A no-code backend** (Airtable via its API, Google Sheets via a script) — a reasonable middle ground if you want submissions to land somewhere you already use.

Whichever you pick, test the actual submit flow after switching — not just that the form renders. A form that renders correctly but silently fails on submit is worse than an obviously broken one, because nobody notices until a lead is lost.

## A checklist for after any Framer export

- [ ] Every form's \`action\` points somewhere real (not Framer's original endpoint)
- [ ] Field \`name\` attributes match what your new endpoint expects
- [ ] You've actually submitted a real test entry and confirmed it arrived
- [ ] Any "thank you" state or redirect still fires correctly
- [ ] Spam protection (a honeypot field, or your provider's built-in filtering) is in place — Framer's backend was doing this for you before

If you're using a converter, ask (or check) specifically whether it handles form rewiring — a lot of tools optimize images and fonts thoroughly but leave forms completely untouched, because it's easy to miss in testing if you don't actually try submitting one.`,
  },
  {
    title: "Framer CMS Collections: What Happens to Them When You Export?",
    excerpt: "Framer's CMS is dynamic and lives on Framer's servers. Static HTML exports freeze it at a point in time — here's what that means in practice.",
    tags: ["framer", "cms", "export", "html", "nextjs"],
    content: `If your Framer site uses CMS Collections — a blog, a portfolio grid, case studies — exporting it raises a question that's easy to overlook until it bites you: what happens to that content after you leave?

## The core tradeoff

Framer's CMS is a live, editable data source. Every CMS-driven page is generated dynamically from it at request time (or via ISR-style revalidation) while the site is hosted on Framer. A static HTML export necessarily **freezes** that content at the moment of export — every CMS item becomes its own static page, exactly as it looked when you converted. Add a new blog post in Framer after that, and it won't appear on the exported site, because the export isn't watching Framer's CMS anymore.

This isn't a bug in any particular tool — it's the nature of "static." The real question is what you do about ongoing content changes.

## Three realistic paths forward

1. **You're done adding content.** If the CMS collection was for a specific project (case studies for a completed portfolio, say) and won't be updated again, a one-time static export is exactly right — you get all the content, permanently, with zero ongoing dependency on Framer.
2. **You'll keep publishing, so re-export periodically.** Works fine for a low-frequency blog (a few posts a month) — just re-run the conversion whenever you publish. Annoying at higher frequency.
3. **Move the content to a CMS you actually own**, and rebuild those pages against it. This is the only real fix if you want ongoing edits without repeated re-exports — options range from a headless CMS (Sanity, Contentful) to something as simple as MDX files in your own repo if the volume is manageable.

## What a Next.js export changes

If your export path keeps Framer's runtime intact rather than freezing to static HTML, CMS-driven pages will generally keep working exactly as before — because the runtime is still calling out to Framer's CMS API the same way it did on Framer's own hosting. The tradeoff there is the opposite of the static case: you get live content, but you're still dependent on Framer's servers being up and your Framer plan staying active, which somewhat defeats the point of "leaving Framer" for some people.

There's no universally right answer here — it depends entirely on whether the reason you're exporting is "I want to self-host" (compatible with either path) or "I want zero ongoing Framer dependency" (only the static-freeze path actually delivers that, with the re-export or migrate tradeoffs above).`,
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
