import type { MetadataRoute } from "next";

const siteUrl = "https://framertonextjs.com";

// Only the publicly indexable pages belong here. Authenticated app routes,
// embeds, and API handlers are excluded (and disallowed in robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/nextjs`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/speed`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
