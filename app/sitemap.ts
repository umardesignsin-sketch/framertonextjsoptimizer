import type { MetadataRoute } from "next";
import { dbConfigured } from "@/lib/db";
import { listPublishedPosts } from "@/lib/blog";

const siteUrl = "https://framertonextjs.com";

// Only the publicly indexable pages belong here. Authenticated app routes,
// embeds, and API handlers are excluded (and disallowed in robots.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/framer-to-html`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/nextjs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/speed`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  let posts: MetadataRoute.Sitemap = [];
  if (dbConfigured()) {
    try {
      const rows = await listPublishedPosts();
      posts = rows.map((p) => ({
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
