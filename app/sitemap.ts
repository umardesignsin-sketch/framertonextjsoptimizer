import type { MetadataRoute } from "next";
import { dbConfigured } from "@/lib/db";
import { listPublishedPosts } from "@/lib/blog";

const siteUrl = "https://framertonextjs.com";

// New posts are published straight to the database (no redeploy), so this
// needs to actually refresh — without a revalidate window it's generated
// once at build/deploy time and silently omits every post added since.
export const revalidate = 3600;

// Only the publicly indexable pages belong here. Authenticated app routes,
// embeds, and API handlers are excluded (and disallowed in robots.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/framer-to-html`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/export-framer-site`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/nextjs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/speed`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/nocodexport`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/vs/convertframer`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/guides/self-host-framer`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/guides/remove-made-in-framer-badge`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  let posts: MetadataRoute.Sitemap = [];
  if (dbConfigured()) {
    try {
      const rows = await listPublishedPosts();
      posts = rows
        // Skip placeholder/auto slugs — they 301 to real posts (see next.config redirects).
        .filter((p) => p.slug && p.slug !== "untitled-post" && !p.slug.startsWith("untitled"))
        .map((p) => ({
          url: `${siteUrl}/blog/${p.slug}`,
          lastModified: p.updatedAt,
          changeFrequency: "monthly" as const,
          priority: 0.7,
        }));
    } catch {
      /* db unavailable — ship static routes only */
    }
  }

  return [...staticRoutes, ...posts];
}
