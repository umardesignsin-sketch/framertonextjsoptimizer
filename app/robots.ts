import type { MetadataRoute } from "next";

const siteUrl = "https://framertonextjs.com";

// Public marketing/tool pages are crawlable; the authenticated app surface,
// embeds, and API are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/editor",
        "/studio",
        "/login",
        "/signup",
        "/embed",
        "/api",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
