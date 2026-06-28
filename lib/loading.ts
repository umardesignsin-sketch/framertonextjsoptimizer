// LCP heuristic: the first in-DOM image is treated as the hero (eager, high
// priority); everything else is lazy-loaded. Avoids the classic mistake of
// lazy-loading the LCP image, which tanks mobile Performance.
import type { Doc } from "./parse";

export function optimizeImageLoading($: Doc): void {
  const imgs = $("img").toArray();
  imgs.forEach((el, i) => {
    const $el = $(el);
    if (i === 0) {
      $el.attr("loading", "eager");
      $el.attr("fetchpriority", "high");
      $el.removeAttr("decoding");
    } else {
      if (!$el.attr("loading")) $el.attr("loading", "lazy");
      $el.attr("decoding", "async");
    }
  });
}
