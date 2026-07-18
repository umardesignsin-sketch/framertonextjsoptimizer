// Parse layer: load a Framer SSR document with cheerio, detect that it really is
// a Framer site, and pull out the metadata we need for the SEO pass.
import * as cheerio from "cheerio";

export type Doc = cheerio.CheerioAPI;

export function load(html: string): Doc {
  return cheerio.load(html);
}

export interface FramerDetection {
  isFramer: boolean;
  reasons: string[];
}

/** Heuristic: is this actually a Framer-published page? */
export function detectFramer($: Doc): FramerDetection {
  const reasons: string[] = [];
  const generator = $('meta[name="generator"]').attr("content") || "";
  if (/framer/i.test(generator)) reasons.push("generator meta = " + generator);
  if ($('meta[name="framer-search-index"]').length) reasons.push("framer-search-index meta");
  if ($("script[data-framer-bundle]").length) reasons.push("data-framer-bundle script");
  if ($("[data-framer-appear-id]").length) reasons.push("data-framer-appear-id elements");
  if ($("style[data-framer-css-ssr-minified]").length) reasons.push("framer ssr css");
  if ($("#main").length) reasons.push("#main container");
  // Require at least two independent signals to call it Framer.
  return { isFramer: reasons.length >= 2, reasons };
}

export interface PageMeta {
  title: string;
  description: string;
  lang: string;
  canonical: string;
  viewport: string;
  favicon: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  searchIndexUrl: string;
  robots: string;
}

export function extractMeta($: Doc): PageMeta {
  return {
    title: $("title").first().text().trim(),
    description: $('meta[name="description"]').attr("content") || "",
    lang: $("html").attr("lang") || "",
    canonical: $('link[rel="canonical"]').attr("href") || "",
    viewport: $('meta[name="viewport"]').attr("content") || "",
    favicon:
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      "",
    ogTitle: $('meta[property="og:title"]').attr("content") || "",
    ogDescription: $('meta[property="og:description"]').attr("content") || "",
    ogImage: $('meta[property="og:image"]').attr("content") || "",
    searchIndexUrl: $('meta[name="framer-search-index"]').attr("content") || "",
    robots: $('meta[name="robots"]').attr("content") || "",
  };
}

/** Collect the CSS text from every <style> tag (for font-url discovery, etc.). */
export function collectStyleText($: Doc): string {
  let css = "";
  $("style").each((_, el) => {
    css += "\n" + ($(el).html() || "");
  });
  return css;
}
