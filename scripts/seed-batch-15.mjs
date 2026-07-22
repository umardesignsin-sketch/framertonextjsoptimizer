import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function slugify(s) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const posts = [
  {
    title: "How to Refine a Framer-to-Next.js Export with Cursor or Claude Code",
    excerpt: "Pure Next.js exports optimize for exact fidelity, not hand-decomposed components — here's the honest reason why, and the actual workflow for cleaning the output up with an AI coding assistant afterward.",
    tags: ["framer", "nextjs", "cursor", "claude code", "workflow"],
    content: `A Pure Next.js export from this tool ships each page as a single, byte-exact HTML string inside a Next.js Route Handler — not hand-decomposed React components. That's a deliberate tradeoff, not a limitation we're hiding, and it's worth explaining plainly so you know exactly what you're getting and what a good next step looks like.

## Why the output isn't pre-split into components

Framer's runtime — its animation engine, hover states, appear effects — depends on specific HTML structure, including comment nodes React has no syntax to emit. We tried decomposing captured pages into clean, separate JSX components once. It looked right structurally and broke Framer's hydration in a way that only showed up as a real, measured regression (mobile Performance dropped from 94 to 62) — because losing those comment nodes forces Framer's runtime into a slow client-side re-render instead of hydrating instantly. So the export keeps the page as one exact string on purpose: fidelity and componentization are in tension here, and we chose fidelity.

Every generated \`route.ts\` file does include an orientation comment at the top — the page's nav links and heading outline — so you're not opening a completely unlabeled wall of markup. But that's a map, not a rewrite.

## Where an AI coding assistant actually helps

This is the honest, practical next step once you have working, deployed code: point Cursor or Claude Code at the generated project and ask it to extract specific, self-contained pieces into real components — a pricing table, a testimonials section, a footer — one at a time. Two things make this safe in a way that decomposing the whole page automatically wasn't:

- **You (or the assistant) can verify each extraction visually** before moving to the next one, instead of committing to a full-page transform in one shot.
- **You're not obligated to touch the animation-heavy sections at all.** Leave the parts that depend on Framer's hydration timing exactly as they are, and only extract the static, content-only pieces — the ones with no runtime dependency to break.

A reasonable prompt to hand Claude Code or Cursor once the project's deployed and working:

> "This page is one large HTML string in app/route.ts. Extract the testimonials section (search for the heading text in the page-map comment at the top of the file) into its own component under app/components/, keeping the exact same markup and classes — don't reformat or 'clean up' anything inside it, just move it."

Asking for **exact extraction, not rewriting**, is the important part — the same lesson as the fidelity/componentization tradeoff above, just applied at a smaller, safer scale.

## What not to ask an assistant to do

Don't ask it to "rewrite this page as clean React components" in one pass — that's the exact transform we already tried and measured breaking. Piecemeal, verified extraction of static sections is the version of "clean editable code" that's actually achievable without giving up fidelity; a full-page rewrite in one shot is the version that isn't, for the same structural reason it wasn't safe for us to automate.

## The realistic workflow

1. Convert with [Pure Next.js](/nextjs) — get a real, deployable project with fidelity intact.
2. Deploy it and confirm it looks and behaves exactly like the original.
3. Use an AI coding assistant to extract specific static sections into components, one at a time, verifying each one.
4. Leave the animation-dependent sections as-is unless you're deliberately trading fidelity for cleaner code in that one spot.

This is the same "design in Framer, convert, refine with an AI coding assistant" pipeline a lot of people already reach for — we're just being explicit about which part of that pipeline this tool does (step 2, faithfully) and which part is genuinely better handled by you and an assistant working section by section (step 3), rather than pretending we hand you finished components we don't.`,
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
