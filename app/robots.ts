import type { MetadataRoute } from "next";

const siteUrl = "https://framertonextjs.com";

// Public marketing/tool pages are crawlable; the authenticated app surface,
// embeds, and API are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // `/api/preview` serves the rendered converted pages that the PageSpeed
      // checker audits — it must NOT be blocked, or Lighthouse's high-weighted
      // "page isn't blocked from indexing" audit fails and tanks the SEO score.
      // Google applies the most specific (longest) rule, so this Allow wins
      // over the `/api` Disallow below for preview URLs only.
      allow: ["/", "/api/preview"],
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
