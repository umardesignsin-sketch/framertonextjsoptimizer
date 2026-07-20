// Fetch any public URL and extract the meta tags that drive SEO + social
// previews (title, description, canonical, Open Graph, Twitter Card, icons),
// then flag the gaps that commonly break how a link looks when shared.
import { load } from "./parse";
import { fetchText, normalizeUrl } from "./fetch";

export interface MetaCheckResult {
  url: string;
  title: string;
  description: string;
  canonical: string;
  lang: string;
  viewport: string;
  robots: string;
  favicon: string;
  og: {
    title: string;
    description: string;
    image: string;
    type: string;
    siteName: string;
    url: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image: string;
  };
  issues: { severity: "error" | "warning"; message: string }[];
}

function abs(base: string, href: string): string {
  if (!href) return "";
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

export async function checkMetaTags(input: string): Promise<MetaCheckResult> {
  const target = normalizeUrl(input);
  const { text, status, url } = await fetchText(target.toString());
  if (status >= 400) throw new Error(`Fetch failed with status ${status}`);

  const $ = load(text);
  const attr = (sel: string, name = "content") => $(sel).first().attr(name) || "";

  const title = $("title").first().text().trim();
  const description = attr('meta[name="description"]');
  const canonical = attr('link[rel="canonical"]', "href");
  const favicon =
    attr('link[rel="icon"]', "href") || attr('link[rel="shortcut icon"]', "href");

  const og = {
    title: attr('meta[property="og:title"]'),
    description: attr('meta[property="og:description"]'),
    image: attr('meta[property="og:image"]'),
    type: attr('meta[property="og:type"]'),
    siteName: attr('meta[property="og:site_name"]'),
    url: attr('meta[property="og:url"]'),
  };
  const twitter = {
    card: attr('meta[name="twitter:card"]'),
    title: attr('meta[name="twitter:title"]'),
    description: attr('meta[name="twitter:description"]'),
    image: attr('meta[name="twitter:image"]'),
  };
  if (og.image) og.image = abs(url, og.image);
  if (twitter.image) twitter.image = abs(url, twitter.image);
  if (favicon) {
    // handled below, kept relative-safe via abs()
  }

  const issues: MetaCheckResult["issues"] = [];
  if (!title) issues.push({ severity: "error", message: "Missing <title> — most search results and share cards fall back to the URL." });
  else if (title.length > 60) issues.push({ severity: "warning", message: `Title is ${title.length} characters — Google usually truncates past ~60.` });

  if (!description) issues.push({ severity: "error", message: "Missing meta description — search engines will auto-generate a snippet instead." });
  else if (description.length > 160) issues.push({ severity: "warning", message: `Description is ${description.length} characters — likely truncated past ~160.` });

  if (!canonical) issues.push({ severity: "warning", message: "No canonical link tag — risk of duplicate-content indexing on query-string variants." });
  if (!og.title && !og.description && !og.image) issues.push({ severity: "error", message: "No Open Graph tags found — links shared on Facebook, LinkedIn, Slack, and iMessage will show a bare, unstyled preview." });
  else {
    if (!og.image) issues.push({ severity: "warning", message: "No og:image — most platforms show no preview thumbnail at all without one." });
    if (!og.title) issues.push({ severity: "warning", message: "No og:title — falls back to <title>, which may not be tuned for sharing." });
  }
  if (!twitter.card) issues.push({ severity: "warning", message: "No twitter:card tag — X/Twitter falls back to Open Graph, but a summary_large_image card renders larger and gets more clicks." });
  if (!favicon) issues.push({ severity: "warning", message: "No favicon link tag found — browsers will request /favicon.ico as a fallback, which may 404." });

  return {
    url,
    title,
    description,
    canonical,
    lang: $("html").attr("lang") || "",
    viewport: attr('meta[name="viewport"]'),
    robots: attr('meta[name="robots"]'),
    favicon: favicon ? abs(url, favicon) : "",
    og,
    twitter,
    issues,
  };
}
