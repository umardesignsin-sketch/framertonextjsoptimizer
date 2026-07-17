import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "Deploying an Exported Framer Site to Vercel: Step by Step",
    excerpt: "Whether you exported to Next.js or static HTML, here's exactly how the Vercel deploy works and what to check afterward.",
    tags: ["framer", "vercel", "deploy", "nextjs", "html"],
    content: `Once you've converted a Framer site, Vercel is one of the simplest places to actually put it live — here's the real step-by-step, for both export types.

## If you exported to Next.js

1. Push the exported project to a GitHub repository (or use a one-click deploy flow if your converter offers it).
2. In Vercel, "Add New Project" and import that repository. Vercel auto-detects Next.js and sets the build command (\`next build\`) and output correctly — no config needed for a standard export.
3. Add your custom domain under Project Settings → Domains, and point your DNS (an A/CNAME record, depending on whether it's an apex domain or subdomain) at Vercel's values.
4. Deploy. Every future push to your main branch redeploys automatically.

## If you exported to static HTML

Static HTML doesn't need a build step at all — it's arguably even simpler:

1. In Vercel, choose "Deploy" and either connect the repo or drag-and-drop the exported folder if your converter's dashboard supports a direct static deploy.
2. Set the framework preset to "Other" (no build command needed) if importing via Git.
3. Domain setup is identical to the Next.js path above.

## What to actually check after deploying

- **Every route resolves** — click through your site's full nav, not just the homepage. Multi-page Framer sites sometimes miss a route if the exporter's page-discovery didn't crawl everything.
- **Images load from your own domain**, not still pointing at \`framerusercontent.com\` — a partial export can leave some image references unrewritten.
- **Forms actually submit** — see our guide on Framer forms after export; this is the single most commonly missed step.
- **Run a fresh Lighthouse audit** on the live Vercel URL, not just a local preview — real CDN edge performance differs from local.
- **Check your canonical URLs and sitemap** point at your new domain, not the original Framer subdomain, if SEO continuity matters to you.

Vercel's free tier comfortably covers most personal and small business sites — the point of exporting off Framer's hosting is usually cost and control, and Vercel (or Netlify, which works almost identically) delivers both without a steep learning curve.`,
  },
  {
    title: "Deploying an Exported Framer Site to Netlify",
    excerpt: "Netlify is the other obvious home for an exported Framer site — here's how the setup differs from Vercel and what to watch for.",
    tags: ["framer", "netlify", "deploy", "html", "nextjs"],
    content: `Netlify is a close sibling to Vercel for hosting an exported Framer site, with a slightly different setup flow worth knowing if you're choosing between them.

## Static HTML export

This is Netlify's most natural fit — it was built around static sites long before either platform supported serverless functions well.

1. Drag-and-drop your exported project folder directly onto Netlify's dashboard, or connect it via Git for auto-deploys on every push.
2. No build command needed for pure static HTML — set "Publish directory" to the folder root (or wherever your exported \`index.html\` lives).
3. Add your custom domain under Site Settings → Domain management, update your DNS records as instructed.

## Next.js export

Netlify supports Next.js via its own adapter (\`@netlify/plugin-nextjs\`), auto-detected for most standard App Router projects:

1. Connect your GitHub repo.
2. Netlify should auto-detect the framework and set the build command to \`next build\`. Verify it did — occasionally a nonstandard project structure needs the build command set manually.
3. Domain setup works the same as the static case.

## Vercel vs Netlify for this specific use case

Functionally, both are excellent, free-tier-friendly choices and the difference rarely matters for a converted Framer site. A few genuinely practical distinctions:

- **Next.js-specific features** (image optimization, some newer App Router capabilities) are natively first-party on Vercel, since Vercel builds Next.js. Netlify's adapter covers the common cases well but occasionally lags a version behind on brand-new features.
- **Static HTML deploys** are arguably even more frictionless on Netlify's classic drag-and-drop flow if you're not using Git at all.
- **Pricing** is comparable at the free/hobby tier for a typical marketing or portfolio site — check current limits if you expect meaningful traffic.

For most people converting a single Framer site, either works with no meaningful downside — pick whichever platform you're already more comfortable with, or whichever your converter's one-click deploy already integrates with.`,
  },
  {
    title: "Can You Self-Host a Framer Website for Free?",
    excerpt: "Framer's own hosting always has a monthly cost past the free tier's limits. Here's what a genuinely free self-hosted setup actually looks like.",
    tags: ["framer", "self-host", "free", "pricing"],
    content: `"Free Framer hosting" and "self-hosting a Framer site for free" are two different questions, and mixing them up is where a lot of confusion starts.

## Framer's own free tier

Framer does offer a free plan, but it comes with real constraints most business sites outgrow fast: a Framer-branded subdomain (not your own domain), the "Made in Framer" badge, and limits on CMS items and traffic. A custom domain alone requires a paid plan. So "free Framer hosting" in practice means "free until you need a domain," which is almost immediately.

## What self-hosting actually means here

Self-hosting means the exported output of your Framer site (HTML/CSS/JS, or a Next.js project) lives on infrastructure you control — not Framer's servers at all. Once exported, genuinely free hosting options include:

- **Vercel's free tier** — generous for a typical marketing site, supports both static and Next.js exports, custom domains included.
- **Netlify's free tier** — comparable limits, especially strong for pure static HTML.
- **Cloudflare Pages** — also free at reasonable traffic levels, with Cloudflare's CDN built in.
- **GitHub Pages** — free, static-only, no serverless functions, fine for a simple site with no forms/dynamic backend needs.

All four support a custom domain on their free tier — the constraint that made Framer's free plan impractical (no custom domain) doesn't apply once you've exported.

## The real cost that doesn't disappear

Your domain registration itself (typically $10–15/year) is a cost regardless of which hosting path you take — that's not a Framer-specific expense, every website has it. Beyond that, a self-hosted export genuinely can run at $0/month indefinitely for a typical low-to-moderate traffic site, which is the actual answer to "can I self-host for free": yes, once you're off Framer's hosting entirely, not before.

The one thing to plan for: if your site uses Framer's CMS and you want ongoing content updates without re-exporting, that's a separate consideration — see our guide on what happens to CMS collections after export.`,
  },
  {
    title: "What Happens If You Stop Paying for Framer?",
    excerpt: "Your site doesn't just quietly keep running on a lower tier. Here's exactly what breaks, and how to make sure you're not caught off guard.",
    tags: ["framer", "pricing", "cancel", "hosting"],
    content: `This is worth knowing before it happens to you, not after — cancelling or downgrading a paid Framer plan has real, immediate consequences for a live site.

## What actually happens

If you cancel a paid Framer plan (or a subscription lapses), the site tied to that workspace typically stops being served on your custom domain — Framer's hosting is what serves it, and that access is what you were paying for. Depending on your plan and how far you downgrade, you may lose the custom domain connection entirely, revert to Framer's own subdomain, or have the published site taken offline altogether if you drop below what your CMS/traffic usage requires.

This isn't unique to Framer — it's how every hosted, no-code platform's business model works. The distinction that matters is what your *options* are when it happens.

## Where Framer specifically leaves you exposed

Because Framer has no official export function, if your plan lapses and you haven't independently preserved a copy of your site, you don't have a fallback to quickly stand back up elsewhere. You'd be starting from whatever you can reconstruct manually, or rebuilding from scratch in the Framer editor once you're paid up again.

## How to actually protect yourself

- **Export a backup copy periodically**, even if you have no plans to leave Framer right now. Treat it like any other backup — the value is entirely in having it *before* you need it.
- **Know your renewal date** and set a reminder, especially if the site is business-critical and a lapse would mean real downtime.
- **If you're already unsure whether you'll stay on Framer long-term**, export sooner rather than later — you can always keep using Framer's editor for design changes and re-export periodically, getting the best of both.

The underlying lesson applies beyond Framer specifically: any site living entirely on a platform-controlled hosting bill is one missed payment away from going dark, unless you've deliberately kept an independent, exportable copy somewhere.`,
  },
  {
    title: "Framer Alternatives in 2026: A Practical Comparison",
    excerpt: "Framer, Webflow, Squarespace, Webstudio, and 'just export and self-host' — a fast, honest rundown of when each actually makes sense.",
    tags: ["framer alternatives", "comparison", "webflow", "squarespace", "webstudio"],
    content: `If you're evaluating whether Framer is still the right platform for you — or looking at what else exists before committing — here's a fast, honest rundown without the marketing spin.

## Webflow
The closest direct competitor. More mature interaction/CMS tooling in some areas, a genuinely more portable code export (verbose, but real), and a bigger third-party ecosystem. Best if you want visual-builder power *and* a supported way to eventually export.

## Squarespace
Not really a Framer competitor so much as a different category — templated rather than freeform. Best if you want a professional site fast with minimal design decisions, and don't need Framer's level of pixel control.

## Webstudio
The newest name on this list, and the only one built explicitly around avoiding lock-in from day one (open-source, self-hostable). Smaller ecosystem and less mature than Framer today, but worth watching — and worth strongly considering if you haven't built anything yet and portability is your top priority.

## WordPress (with a page builder)
More setup overhead, but genuinely the most portable, most self-hostable option of all — it's just software you run, not a platform you're renting. The tradeoff is real technical maintenance responsibility (updates, security, hosting) that Framer/Webflow/Squarespace all abstract away for you.

## "Stay on Framer, but export a portable copy"
The option most people considering this comparison actually want without realizing it: you keep Framer's design experience (which is genuinely good) for building and editing, and periodically export a real, deployable HTML or Next.js copy so you're never fully locked to Framer's hosting bill or uptime. This sidesteps the entire "which platform" question — you're not migrating away from Framer's editor, just decoupling your *hosting* from it.

## The actual decision framework

Ask yourself one question: is your concern the *design experience* (in which case, compare Framer/Webflow/Squarespace/Webstudio on their editors) or the *hosting lock-in* (in which case, exporting your existing Framer site is almost always faster than a full platform migration, and doesn't throw away work you've already done).`,
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
