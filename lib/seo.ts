// SEO / Best-Practices / Accessibility pass. These mutations reliably push
// SEO + Best-Practices + Accessibility toward 95-100 on a snapshot.
import type { Doc, PageMeta } from "./parse";

export interface SeoResult {
  altsAdded: number;
  badgeRemoved: boolean;
  notes: string[];
}

export function seoPass($: Doc, meta: PageMeta, route: string): SeoResult {
  const notes: string[] = [];

  // <html lang>
  if (!$("html").attr("lang")) {
    $("html").attr("lang", "en");
    notes.push("added html lang=en");
  }

  // viewport
  const vp = $('meta[name="viewport"]');
  if (!vp.length) {
    $("head").prepend(
      '<meta name="viewport" content="width=device-width, initial-scale=1">'
    );
    notes.push("added viewport");
  } else if (!/initial-scale/.test(vp.attr("content") || "")) {
    vp.attr("content", "width=device-width, initial-scale=1");
  }

  // charset
  if (!$("meta[charset]").length) {
    $("head").prepend('<meta charset="utf-8">');
  }

  // title / description
  if (!$("title").length && meta.title) {
    $("head").append(`<title>${escapeHtml(meta.title)}</title>`);
  }
  if (!$('meta[name="description"]').length && meta.description) {
    $("head").append(
      `<meta name="description" content="${escapeAttr(meta.description)}">`
    );
  }

  // Open Graph fallbacks
  const ensureMeta = (prop: string, content: string) => {
    if (!content) return;
    if (!$(`meta[property="${prop}"]`).length) {
      $("head").append(
        `<meta property="${prop}" content="${escapeAttr(content)}">`
      );
    }
  };
  ensureMeta("og:title", meta.ogTitle || meta.title);
  ensureMeta("og:description", meta.ogDescription || meta.description);
  if (!$('meta[property="og:type"]').length) {
    $("head").append('<meta property="og:type" content="website">');
  }

  // Canonical / og:url / hreflang: Framer hard-codes these to the SOURCE
  // origin (e.g. https://your-site.framer.website/…). Left untouched, the
  // converted-and-deployed copy would tell Google the "real" page still lives
  // on Framer — cratering the deployed site's ranking AND failing Lighthouse's
  // canonical audit (cross-origin canonical). Rewrite absolute references to
  // ROOT-RELATIVE so they self-reference whatever domain serves the export.
  let canonicalFixed = 0;
  $('link[rel="canonical"]').each((_, el) => {
    const rel = toRootRelative($(el).attr("href"));
    if (rel) {
      $(el).attr("href", rel);
      canonicalFixed++;
    }
  });
  $('meta[property="og:url"]').each((_, el) => {
    const rel = toRootRelative($(el).attr("content"));
    if (rel) $(el).attr("content", rel);
  });
  // Framer's hreflang alternates point at the source origin. A relative
  // hreflang is invalid (Google + Lighthouse require fully-qualified URLs),
  // and a cross-origin one points back to Framer. For a single-locale export
  // they're just noise — remove them so the hreflang audit stays clean.
  $('link[rel="alternate"][hreflang]').remove();
  if (canonicalFixed) notes.push("pointed canonical at the deployed site (was Framer's URL)");

  // If the page had NO canonical at all, add a self-referencing one from the
  // route path (root-relative, so it works on any deploy domain).
  if (!$('link[rel="canonical"]').length) {
    const path = toRootRelative(meta.canonical) || (route && route.startsWith("/") ? route : "/");
    $("head").append(`<link rel="canonical" href="${escapeAttr(path)}">`);
  }

  // image alt text
  let altsAdded = 0;
  $("img").each((_, el) => {
    if ($(el).attr("alt") === undefined) {
      $(el).attr("alt", "");
      altsAdded++;
    }
    // explicit dimensions help CLS; leave Framer's if present
  });
  if (altsAdded) notes.push(`added alt="" to ${altsAdded} images`);

  // Remove the Framer badge ("Made in Framer").
  const badgeSel = [
    "#__framer-badge-container",
    ".framer-badge-container",
    ".framer-badge",
    "[data-framer-badge]",
    'a[href*="framer.com/?via"]',
    'a[href^="https://www.framer.com/?via"]',
  ].join(",");
  let badgeRemoved = false;
  $(badgeSel).each((_, el) => {
    $(el).remove();
    badgeRemoved = true;
  });
  // Also catch "Made in Framer" anchors by text.
  $("a").each((_, el) => {
    const txt = $(el).text().trim().toLowerCase();
    if (txt === "made in framer" || txt === "made with framer") {
      $(el).remove();
      badgeRemoved = true;
    }
  });
  if (badgeRemoved) notes.push("removed Framer badge");

  return { altsAdded, badgeRemoved, notes };
}

/**
 * Strip the scheme + host from an absolute URL, keeping a root-relative
 * path (+query+hash). Relative or missing values are returned unchanged.
 * Protocol-relative and non-http(s) values are left alone. Used to make
 * canonical/og:url self-reference the deploy domain instead of Framer's.
 */
function toRootRelative(href: string | undefined): string | undefined {
  if (!href) return href;
  const h = href.trim();
  if (!/^https?:\/\//i.test(h)) return h; // already relative — keep as-is
  try {
    const u = new URL(h);
    return (u.pathname || "/") + u.search + u.hash;
  } catch {
    return h;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
