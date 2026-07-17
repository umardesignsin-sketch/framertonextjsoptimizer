import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const SITE_URL = "https://framertonextjs.com";

const posts = await db.post.findMany({
  where: { status: "published", coverImage: null },
  select: { id: true, slug: true },
});

console.log(`${posts.length} posts without a cover image`);

for (const p of posts) {
  await db.post.update({
    where: { id: p.id },
    data: { coverImage: `${SITE_URL}/blog/${p.slug}/opengraph-image` },
  });
  console.log("set cover:", p.slug);
}

console.log(`\ndone — ${posts.length} posts updated`);
process.exit(0);
