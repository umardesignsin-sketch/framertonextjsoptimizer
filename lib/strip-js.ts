// Strip Framer's compiled JS runtime and neutralize the appear-animation
// opacity:0 trap. This is the single biggest mobile-Performance win.
import type { Doc } from "./parse";

export interface StripResult {
  scriptsRemoved: number;
  modulepreloadsRemoved: number;
  bytesRemoved: number;
  elementsRevealed: number;
}

/**
 * The decisive fix for blank/stuck pages: Framer reveals appear- and
 * scroll-animated elements from an inline `opacity:0` (+ transform offset, +
 * blur) start state using its JS runtime. With the runtime removed, those
 * elements stay hidden forever. A CSS rule only reaches the handful tagged with
 * data-framer-appear-id, so we rewrite the inline styles directly:
 *   - opacity:0  (EXACTLY zero, never 0.6 etc.)  -> opacity:1
 *   - the paired transform offset (translate/scale/…) -> transform:none
 *   - a stuck filter: …blur(…) (but NOT backdrop-filter) -> filter:none
 */
export function revealHiddenElements($: Doc, skipAppearIds = false): number {
  let count = 0;
  const EXACT_ZERO = /opacity:\s*0(?![.\d])/;
  const BLUR_FILTER = /(?<!backdrop-)filter:\s*[^;]*blur\(/i;

  $("[style]").each((_, el) => {
    const $el = $(el);
    // Don't force-reveal menu/nav overlays — they're meant to start closed and
    // are managed by the hamburger script.
    const name = $el.attr("data-framer-name") || "";
    if (/menu|drawer|hamburger/i.test(name)) return;
    // When animations are being restored, leave appear elements to the appear
    // layer instead of force-revealing them to their final state.
    if (skipAppearIds && $el.attr("data-framer-appear-id") !== undefined) return;
    let style = $el.attr("style") || "";
    let changed = false;

    if (EXACT_ZERO.test(style)) {
      style = style.replace(/opacity:\s*0(?![.\d])/g, "opacity:1");
      // neutralize the appear/scroll start transform so it rests in place
      style = style.replace(/transform:\s*[^;]+/g, "transform:none");
      changed = true;
    }
    // clear a stuck entrance blur even when the element isn't opacity:0
    if (BLUR_FILTER.test(style)) {
      style = style.replace(/(?<!backdrop-)filter:\s*[^;]+/g, "filter:none");
      changed = true;
    }
    if (changed) {
      $el.attr("style", style);
      count++;
    }
  });
  return count;
}

// CSS that forces every appear-animation element to its final, visible state.
// Framer starts these at opacity:0 / translated, expecting JS to reveal them —
// without the runtime they'd render BLANK, so we force them on.
const APPEAR_FIX_CSS = `
/* injected by framer-optimizer: reveal appear-animation elements (runtime removed) */
[data-framer-appear-id]{opacity:1 !important;transform:none !important;filter:none !important;}
[data-framer-appear-id] *{opacity:1 !important;}
`;

// Tiny vanilla hamburger toggler (~700B). Best-effort: wires up common Framer
// mobile-menu patterns so navigation still works after the runtime is removed.
const HAMBURGER_JS = `
(function(){
  function vis(el,on){ if(!el) return; el.style.display=on?'':'none'; el.style.opacity=on?'1':''; el.style.pointerEvents=on?'auto':''; }
  function match(re){ return Array.prototype.slice.call(document.querySelectorAll('[data-framer-name]')).filter(function(n){return re.test(n.getAttribute('data-framer-name')||'');}); }
  var triggers = match(/menu|hamburger|burger|nav.?(open|toggle|icon)/i);
  var overlays = match(/menu.?(overlay|open|panel)|nav.?(overlay|panel)|mobile.?menu|overlay/i);
  if(!triggers.length || !overlays.length) return;
  var open=false;
  function setAll(on){ overlays.forEach(function(o){ vis(o,on); }); open=on; }
  setAll(false);
  triggers.forEach(function(t){ t.style.cursor='pointer'; t.addEventListener('click',function(e){ e.preventDefault(); setAll(!open); }); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') setAll(false); });
})();
`;

/**
 * Remove ONLY third-party analytics/trackers, leaving Framer's own runtime and
 * scripts intact. Safe for hybrid mode (full fidelity) — these scripts are
 * render-blocking, hurt Best-Practices, and are never needed for the site to
 * render or behave correctly. JSON-LD and genuine custom embeds are preserved.
 */
export function removeTrackers($: Doc): number {
  let removed = 0;
  $(
    'script[src*="googletagmanager"], script[src*="google-analytics"], script[src*="gtag/js"], script[src*="hotjar"], script[src*="segment.com"], script[src*="segment.io"], script[src*="mixpanel"], script[src*="fullstory"], script[src*="clarity.ms"], script[src*="doubleclick"], script[src*="facebook.net"]'
  ).each((_, el) => {
    $(el).remove();
    removed++;
  });

  const TRACKER_INLINE =
    /googletagmanager|dataLayer|gtag\(|hj\(|hotjar|mixpanel|analytics\.track|fbq\(|clarity\(/i;
  $("script:not([src])").each((_, el) => {
    const type = ($(el).attr("type") || "").toLowerCase();
    if (type === "application/ld+json") return; // keep structured data
    const code = $(el).html() || "";
    if (TRACKER_INLINE.test(code)) {
      $(el).remove();
      removed++;
    }
  });
  return removed;
}

export function stripRuntime(
  $: Doc,
  opts: { hamburger: boolean; appearFix?: boolean } = { hamburger: true }
): StripResult {
  // appearFix forces appear-animation elements to their final state. Skip it
  // when the appear layer (lib/appear.ts) is restoring real animations.
  const appearFix = opts.appearFix ?? true;
  let bytesRemoved = 0;
  let scriptsRemoved = 0;
  let modulepreloadsRemoved = 0;

  const drop = (el: import("domhandler").Element) => {
    bytesRemoved += ($.html(el) || "").length;
  };

  // 1. The main module bundle + any ES-module scripts (Framer hydration).
  $('script[type="module"], script[data-framer-bundle]').each((_, el) => {
    drop(el as never);
    $(el).remove();
    scriptsRemoved++;
  });

  // 2. modulepreload links (100+ of them point at the runtime chunks).
  $('link[rel="modulepreload"]').each((_, el) => {
    drop(el as never);
    $(el).remove();
    modulepreloadsRemoved++;
  });

  // 3. Framer's own data scripts: appear, handover, breakpoints, reduce flag.
  $(
    'script[type^="framer/"], script[data-framer-appear-animation], script[id^="__framer__"]'
  ).each((_, el) => {
    drop(el as never);
    $(el).remove();
    scriptsRemoved++;
  });

  // 4. Third-party trackers that tank Best-Practices/Performance. Keep JSON-LD.
  $(
    'script[src*="events.framer.com"], script[src*="googletagmanager"], script[src*="google-analytics"], script[src*="hotjar"], script[src*="segment"]'
  ).each((_, el) => {
    drop(el as never);
    $(el).remove();
    scriptsRemoved++;
  });

  // Remove inline bootstrap scripts that are Framer-internal or known trackers.
  // Preserve JSON-LD (SEO) and genuine custom embeds (unknown inline scripts).
  const FRAMER_INTERNAL =
    /googletagmanager|dataLayer|gtag\(|framer\.com\/edit|init\.mjs|__framer|appearAnimation|framerusercontent\.com\/sites|navigator\.serviceWorker|rbar_|window\.__framer/i;
  $("script:not([src])").each((_, el) => {
    const type = ($(el).attr("type") || "").toLowerCase();
    if (type === "application/ld+json") return; // keep structured data
    if ($(el).attr("data-framer-optimizer") !== undefined) return; // our own
    const code = $(el).html() || "";
    if (FRAMER_INTERNAL.test(code)) {
      drop(el as never);
      $(el).remove();
      scriptsRemoved++;
    }
  });

  // Reveal inline-hidden appear/scroll elements (the decisive blank-page fix).
  // When the appear layer is active, leave appear-id elements for it to animate.
  const elementsRevealed = revealHiddenElements($, !appearFix);

  // Inject the appear-fix CSS as the LAST style in <head> so it wins the
  // cascade — but only when we are NOT restoring real animations.
  if (appearFix) {
    $("head").append(`<style data-framer-optimizer="appear-fix">${APPEAR_FIX_CSS}</style>`);
  }

  // Best-effort hamburger restore.
  if (opts.hamburger) {
    $("body").append(
      `<script data-framer-optimizer="menu">${HAMBURGER_JS}</script>`
    );
  }

  return { scriptsRemoved, modulepreloadsRemoved, bytesRemoved, elementsRevealed };
}
