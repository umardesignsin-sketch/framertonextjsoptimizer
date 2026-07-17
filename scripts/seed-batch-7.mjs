import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Framer to Tailwind CSS: What a Class-Based Export Actually Looks Like",
    excerpt: "Framer's generated CSS is hash-based utility classes, not human-authored. Here's the honest picture of converting that to real Tailwind.",
    tags: ["framer", "tailwind", "css", "developers"],
    content: `Developers who prefer working in Tailwind sometimes ask whether an exported Framer site can come out as genuine Tailwind CSS rather than Framer's own generated stylesheet — the honest answer requires understanding what Framer's CSS actually is first.

## What Framer's CSS actually looks like

Framer generates its own class names — things like \`framer-XXXX\` hashes — each tied to a specific compiled component instance, with corresponding CSS rules Framer's build process produces from the visual design. It's functionally a utility-adjacent system, but not Tailwind, and not meant to be hand-edited — it's compiler output, similar in spirit to how a CSS-in-JS library generates scoped class names.

## Why a direct "convert to Tailwind" isn't a simple find-and-replace

Tailwind's utility classes map to specific, known values (\`p-4\`, \`flex\`, \`text-lg\`) with a shared, predictable scale. Framer's generated classes don't correspond 1:1 to that vocabulary — a real automated conversion would need to parse every computed style Framer's CSS produces and re-derive the closest matching Tailwind utilities (or arbitrary-value classes, for anything that doesn't cleanly map to Tailwind's default scale), for every single element. That's a genuinely hard, lossy translation problem, not a renaming exercise.

## What's realistic today

**Keep Framer's original classes, add Tailwind only for new work.** The pragmatic approach for most teams: export with Framer's original CSS intact (safest for pixel fidelity — renaming or restructuring Framer's classes is exactly the kind of change most likely to introduce visual regressions), and use Tailwind only for genuinely new components or pages you build going forward, rather than trying to convert the existing exported markup.

**Manual conversion for specific components**, if you have a real reason to rebuild a particular section in Tailwind (say, you're substantially redesigning one part of the page anyway) — treat that as writing new code referencing the original as a visual guide, not an automated conversion of the existing markup.

## The bottom line

There's no clean, automated Framer-to-Tailwind conversion today, for the same underlying reason there's no clean automated conversion of any compiled utility-CSS output to a different utility system — the source data needed for a faithful, non-lossy translation (the original design intent, not just the computed pixel values) isn't fully recoverable from generated CSS alone. If Tailwind is a hard requirement for your codebase going forward, plan on new pages/components being hand-built in Tailwind, with the exported Framer content living alongside as-is.`,
  },
  {
    title: "What If My Framer Client Won't Pay for Hosting Anymore?",
    excerpt: "A common agency problem: the site is done, the client relationship is winding down, but they still need the site live. Here's the practical path.",
    tags: ["framer", "agencies", "clients", "hosting", "freelance"],
    content: `This is a genuinely common situation for freelancers and agencies: you built a client's site in Framer, the engagement is ending, and the client either doesn't want to keep paying Framer's hosting fee under your account, or wants full independence from any ongoing platform relationship tied to you.

## Why this comes up specifically with Framer

Unlike a WordPress site (where handing over hosting credentials is straightforward — it's just a server), a Framer site's "hosting" is inseparable from the Framer account it's published under. Transferring full ownership means either the client needs their own Framer account and plan (a new recurring cost for them, and a workspace transfer process), or the relationship with Framer hosting continues indirectly through you, which most agencies don't want long-term for a finished engagement.

## The export path solves this cleanly

Converting the finished site to a static HTML or Next.js export sidesteps the whole problem: the client gets a real, standalone codebase they (or any future developer) can host anywhere, with zero ongoing dependency on a Framer account — yours or theirs. No recurring Framer bill for them to take over, no workspace transfer complexity, no ongoing tie to your agency's Framer workspace.

## What to actually hand over

- The exported project (static HTML or Next.js — see our developer-focused guide on what each export type gives you)
- A brief note on where things stand: any forms that need rewiring to a real endpoint (see our forms-after-export guide), any custom animations worth spot-checking, domain/DNS status
- Deployment done, or clear instructions for their own team/future developer to deploy it (Vercel and Netlify are both fast, low-cost options — see our deploy guides for each)

## Setting this expectation earlier is even better

If you know from the start of an engagement that a client relationship has a defined end date, mentioning the export option early — even just "we'll hand over a portable, self-hostable version at project close" — avoids this becoming an awkward late-stage conversation, and is a genuinely useful thing to be able to promise clients who are wary of platform lock-in in the first place.`,
  },
  {
    title: "Framer vs Building From Scratch: When Custom Code Actually Wins",
    excerpt: "Framer is faster for most sites. Here's the honest case for skipping it and hand-coding instead, and when that tradeoff actually makes sense.",
    tags: ["framer", "custom code", "comparison", "developers"],
    content: `Framer (and no-code builders generally) get positioned as strictly faster than hand-coding, and for most sites that's true — but "most sites" isn't "every site," and it's worth knowing where the tradeoff actually flips.

## Where Framer genuinely wins

For a typical marketing site, portfolio, or landing page, Framer's speed advantage is real and substantial — a capable designer can go from blank canvas to a polished, responsive, published site in a fraction of the time hand-coding would take, with a visual editor that makes ongoing content changes trivial without touching code at all.

## Where hand-coding starts to win

**Highly custom, non-standard interactions.** If your design calls for something genuinely novel — a custom WebGL scene, an interaction pattern Framer's variant system wasn't built to express — you'll eventually be fighting the tool rather than being accelerated by it. Framer is excellent within its interaction model; outside it, hand-coding with a library built for that specific need (Three.js, GSAP, whatever fits) is often less friction, not more.

**Performance ceiling requirements.** If your absolute performance ceiling matters enormously (a high-traffic e-commerce site where every 100ms of load time has a measurable revenue impact), hand-written code with zero platform runtime overhead will always have a higher achievable ceiling than any visual builder, Framer included — the runtime weight discussed throughout this site's other posts is a real, structural cost that hand-coding simply doesn't have.

**Long-term maintenance by a dedicated engineering team.** If you already have developers who'll own this codebase for years, building it in their native tools and conventions from day one avoids an eventual "should we export off Framer" conversation entirely.

**Genuine platform independence from day one.** If avoiding any hosting lock-in, at any point, is a hard requirement — not a "nice to have we'll deal with later" — starting with plain code (or an export-friendly option like Webflow or the open-source Webstudio) sidesteps the whole category of problem this site otherwise discusses.

## The honest framework

Ask: is speed-to-launch or long-term flexibility the actual priority for this specific project? Most projects genuinely value speed-to-launch more, which is exactly why Framer (and tools like it) are popular. But if you already know this is the rare project where flexibility and performance ceiling matter more than launch speed, that's worth deciding before you start, not after months of Framer work you'd need to export and potentially rebuild.`,
  },
  {
    title: "Framer Redirects After Migrating to a New Domain or Host",
    excerpt: "Moving off a Framer subdomain, or changing hosts entirely, needs a real redirect strategy — otherwise you lose search rankings and break old links.",
    tags: ["framer", "redirects", "seo", "migration", "domain"],
    content: `If your Framer export involves any URL changes — a new domain, a restructured route, or moving off a Framer-hosted subdomain — redirects are the single most important technical step for not losing the SEO value you've already built.

## Why this matters more than it seems

Every backlink pointing at your old URLs, every bookmark a returning visitor has saved, every page Google has already indexed and ranked — all of that is tied to the specific URL, not just "your site" in the abstract. Change the URL without a redirect, and all of that history effectively resets: visitors hit a 404, and search engines eventually have to rediscover and re-rank the new URL from scratch, losing whatever ranking equity the old URL had accumulated.

## What actually needs a redirect

- **Every existing page**, mapped old URL → new URL, ideally 1:1 (the same content should redirect to its direct new equivalent, not just a blanket redirect to your homepage — a "redirect everything to the homepage" approach loses almost all the SEO value a proper 1:1 mapping preserves).
- **Any URL structure changes**, even on the same domain — if your export changed \`/blog/post-name\` to a different pattern, that's still a URL change needing a redirect.
- **www vs non-www, or http vs https**, if either changed as part of the move — these count as different URLs to search engines even though they look nearly identical to a human.

## How to actually implement redirects, by hosting type

**Vercel/Netlify:** both support a redirects configuration file (\`vercel.json\` or \`netlify.toml\`/\`_redirects\`) where you list old-path → new-path mappings, applied at the edge before your app even runs.

**Next.js specifically:** \`next.config.js\` supports a \`redirects()\` function as an alternative or supplement to hosting-level redirects, useful if you want redirect logic to live alongside your application code.

## Don't forget after setting them up

- Test a sample of old URLs directly — don't just assume the config is correct, actually visit a few and confirm they land on the right new page with a proper 301 (permanent) status, not a 302 (temporary), which search engines treat differently for ranking transfer purposes.
- Update your sitemap to reference only the new URLs.
- If the domain itself changed, submit a Change of Address in Google Search Console in addition to the redirects — the redirects alone help, but the explicit signal speeds up Google's re-association of the new domain with your existing rankings.`,
  },
  {
    title: "Framer Multi-Language Sites: What Happens When You Export",
    excerpt: "If your Framer site has localization set up, exporting raises real questions about routing and content structure. Here's the practical picture.",
    tags: ["framer", "localization", "i18n", "export", "multilingual"],
    content: `Framer supports localized/multi-language sites, and exporting one adds a layer of complexity beyond a single-language export — worth understanding before you convert.

## How Framer structures localized content

Framer's localization typically works through locale-specific routes or subdomains, with each language variant being its own set of pages sharing the same underlying design and layout, differing in content. The exact routing pattern (path-based like \`/es/about\`, or subdomain-based) depends on how the site was configured.

## What a proper export needs to preserve

**Every locale's full route set.** A page-discovery process that only crawls the default language will silently miss every other language's pages entirely — an easy mistake if the export tool wasn't built with localization specifically in mind.

**\`hreflang\` tags**, which tell search engines which language/region each page variant is for, and which URL to serve to users in a given locale — critical for correct international SEO, and easy to lose entirely in a naive export that only preserves visible content, not this kind of metadata.

**Locale-specific metadata** — titles, descriptions, and Open Graph tags should be genuinely translated per locale, not just the visible page content, if the original Framer site had them translated (which not all localized sites bother with — worth checking your source site's actual completeness here too).

## What to verify after exporting a multi-language site

- Every locale's routes actually exist in the exported output, not just the default language
- Language switcher UI (if the original site had one) still works and points to the correct corresponding page in each language, not just to a fixed URL
- \`hreflang\` tags are present and correct in the exported HTML's \`<head>\`
- Locale-specific metadata (title/description) is genuinely per-locale, not duplicated from the default language

## If your export tool doesn't handle this well

Multi-language sites are a meaningfully more complex export case than a single-language site, and not every converter handles the full scope correctly on the first pass — this is worth explicitly testing (checking a non-default locale's pages, not just assuming they came along) rather than assuming a tool that handles single-language sites well automatically handles multi-language ones equally correctly.`,
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
