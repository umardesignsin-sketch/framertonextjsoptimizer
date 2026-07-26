import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "How to Move From Framer to HTML (Without Losing Your Design or Your Rankings)",
    excerpt: "\"Move from Framer to HTML\" means more than exporting files — it's export, hosting, DNS, and redirects. Here's the whole path, not just the conversion step.",
    tags: ["framer", "html", "migration", "hosting"],
    content: `Searching "move from Framer to HTML" usually means one of three things: you want off Framer's hosting fees, you want a site a developer can actually edit, or you're handing a client's project to someone who isn't paying for a Framer seat. All three end at the same technical path — this is the whole thing, not just the export step.

## What "moving" actually involves

Exporting HTML is one part of a bigger move. The full path is:

1. **Export** — turn the published Framer site into static HTML/CSS/JS you own.
2. **Host it somewhere else** — Netlify, Vercel, Cloudflare Pages, S3, or plain shared hosting.
3. **Point your domain at the new host** — update DNS, or add the custom domain in your new host's dashboard.
4. **Keep your URLs identical (or redirect the ones that change)** — this is the step people skip, and it's the one that actually protects your search rankings.

Framer itself doesn't offer an export button for this — [Framer's own help docs confirm published sites can't be exported to standalone HTML for self-hosting](https://www.framer.com/help/articles/can-i-export-my-website-to-html-and-self-host-it/). That's the gap tools like [our Framer to HTML converter](/framer-to-html) fill: paste the published URL, get the files, keep the URL structure.

## Step 1: Export the HTML

Paste your published Framer URL (a \`.framer.website\` domain or your live custom domain) into the [Framer to HTML converter](/framer-to-html). It discovers every page, strips Framer's runtime JS, self-hosts images as WebP, inlines fonts, and removes the "Made in Framer" badge automatically. You get a ZIP, or a one-click deploy straight to Netlify or Vercel.

## Step 2: Pick where it lives now

Static files, so any static host works:

- **Netlify / Vercel** — drag-and-drop the folder, or use the one-click deploy from the converter. Free tier covers most marketing sites.
- **Cloudflare Pages** — same idea, plus Cloudflare's CDN in front by default.
- **Plain shared hosting / S3** — works too, just upload the files; no build step or Node server required for the HTML export.

## Step 3: Point the domain

If you're keeping the same domain, update its DNS (or nameservers, depending on the host) to point at the new provider instead of Framer. If you're moving to a new domain entirely, that's the case redirects below become mandatory, not optional.

## Step 4: Don't skip redirects if URLs change

This is the step that actually determines whether the move costs you search rankings. If every page keeps its exact path, you're fine — the export preserves URL structure automatically. If you're changing domains, or restructuring routes on the way out, set up 301 redirects from every old URL to its new home before the old ones go dark. [We cover the redirect side of a platform move in more depth here](/guides/self-host-framer).

## What doesn't carry over automatically

Being upfront about this, since it's the honest answer people searching this actually want:

- **CMS-driven content freezes at export time.** If your Framer site pulls from a CMS collection, the exported HTML is a snapshot — new CMS entries won't appear until you re-export or hand-edit the files.
- **The heaviest runtime effects get simplified.** Appear and scroll-triggered animations are recreated with CSS and IntersectionObserver, so they survive. Things built entirely on Framer's own JS runtime (custom cursors, certain WebGL scenes) may be simplified for a plain-HTML target — if you need exact runtime fidelity, [export to Next.js instead](/nextjs), which keeps the runtime intact.
- **Password-protected or draft pages don't move.** Only what's actually public gets captured, by design.

## Will rankings survive the move?

Usually they improve, not drop — assuming you keep the same paths (automatic with this converter) or redirect the ones you don't. Titles, meta descriptions, and canonical tags carry through, and a static HTML page without Framer's runtime typically loads faster, which is a ranking factor in its own right, not just a nice-to-have. [Our PageSpeed tool](/speed) compares your old Framer URL against the exported version directly if you want the before/after numbers before you flip DNS.`,
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
console.log(`\ndone — ${inserted} post`);
process.exit(0);
