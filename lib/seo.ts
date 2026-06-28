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

  // canonical (keep original if present; it stays valid)
  if (!$('link[rel="canonical"]').length && meta.canonical) {
    $("head").append(`<link rel="canonical" href="${escapeAttr(meta.canonical)}">`);
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

  void route;
  return { altsAdded, badgeRemoved, notes };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
