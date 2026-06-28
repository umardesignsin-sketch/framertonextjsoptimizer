// Multi-page discovery. Three independent strategies, most reliable first:
//   1. /sitemap.xml (Framer auto-generates it)
//   2. the framer-search-index JSON referenced in <meta>
//   3. crawling same-origin internal <a> links
import { fetchText } from "./fetch";
import { load } from "./parse";

export interface DiscoveredPage {
  route: string; // normalized path, e.g. "/" or "/about"
  url: string; // absolute URL to fetch
}

export function normalizeRoute(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function sameOrigin(u: string, origin: string): boolean {
  try {
    return new URL(u).origin === origin;
  } catch {
    return false;
  }
}

async function fromSitemap(origin: string): Promise<string[]> {
  try {
    const { text, status } = await fetchText(origin + "/sitemap.xml");
    if (status !== 200) return [];
    return [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

async function fromSearchIndex(searchIndexUrl: string): Promise<string[]> {
  if (!searchIndexUrl) return [];
  try {
    const { text, status } = await fetchText(searchIndexUrl);
    if (status !== 200) return [];
    const json = JSON.parse(text);
    const urls: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") {
        if (/^https?:\/\//.test(v) || v.startsWith("/")) urls.push(v);
      } else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(json);
    return urls;
  } catch {
    return [];
  }
}

function fromLinks(html: string, origin: string): string[] {
  const $ = load(html);
  const out: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    try {
      const abs = new URL(href, origin).toString();
      if (sameOrigin(abs, origin)) out.push(abs);
    } catch {
      /* ignore */
    }
  });
  return out;
}

export async function discoverPages(
  startUrl: string,
  startHtml: string,
  searchIndexUrl: string,
  maxPages: number
): Promise<DiscoveredPage[]> {
  const start = new URL(startUrl);
  const origin = start.origin;

  const candidates = new Set<string>([startUrl]);
  const [sitemap, search] = await Promise.all([
    fromSitemap(origin),
    fromSearchIndex(searchIndexUrl),
  ]);
  [...sitemap, ...search, ...fromLinks(startHtml, origin)].forEach((u) => {
    try {
      const abs = new URL(u, origin).toString();
      if (sameOrigin(abs, origin)) candidates.add(abs.split("#")[0]);
    } catch {
      /* ignore */
    }
  });

  const byRoute = new Map<string, DiscoveredPage>();
  // ensure start route is first
  byRoute.set(normalizeRoute(start.pathname), {
    route: normalizeRoute(start.pathname),
    url: startUrl,
  });
  for (const u of candidates) {
    const parsed = new URL(u);
    // skip asset-like paths
    if (/\.(xml|json|png|jpe?g|webp|svg|ico|css|js|woff2?)$/i.test(parsed.pathname))
      continue;
    const route = normalizeRoute(parsed.pathname);
    if (!byRoute.has(route)) byRoute.set(route, { route, url: u });
    if (byRoute.size >= maxPages) break;
  }
  return [...byRoute.values()];
}
