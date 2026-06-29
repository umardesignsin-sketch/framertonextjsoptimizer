// Generates the CSS injected into converted pages to apply the user-selected
// mobile performance optimizations. Everything here is scoped to the mobile
// breakpoint (or prefers-reduced-motion), so desktop fidelity is untouched and
// nothing is emitted when no option is selected.
import type { MobileOptimizations } from "./types";

// Framer's mobile breakpoint is max-width: 809.98px.
const MOBILE = "(max-width: 809.98px)";

const KILL_ANIM = `
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    transition-delay: 0ms !important;
  }
  html { scroll-behavior: auto !important; }`;

// Force Framer appear / scroll-reveal / text-appear elements to their final,
// visible resting state so nothing starts hidden or mid-transform.
const REVEAL = `
  [data-framer-appear-id],
  [data-framer-appear-id] *,
  [data-framer-appear-animation],
  [data-framer-appear-animation] * {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    clip-path: none !important;
  }`;

/** True if any flag implies removing/reducing motion. */
export function anyMotionOpt(m: MobileOptimizations): boolean {
  return (
    m.removeAnimations ||
    m.removeTextEffects ||
    m.removeScrollAnimations ||
    m.reduceMotion ||
    m.prioritizeMobileScore
  );
}

/** True if any optimization (motion or images) is enabled. */
export function anyMobileOpt(m: MobileOptimizations): boolean {
  return anyMotionOpt(m) || m.aggressiveImages;
}

/** WebP quality to use; aggressive image mode encodes smaller. */
export function imageQualityFor(m: MobileOptimizations): number | undefined {
  return m.aggressiveImages || m.prioritizeMobileScore ? 62 : undefined;
}

/** Build the CSS to inject, or "" when nothing applies. */
export function mobileOptCss(m: MobileOptimizations): string {
  const blocks: string[] = [];
  const pri = m.prioritizeMobileScore;

  const killAnim = m.removeAnimations || pri;
  const reveal = m.removeScrollAnimations || m.removeTextEffects || m.removeAnimations || pri;

  if (killAnim || reveal) {
    blocks.push(`@media ${MOBILE} {${killAnim ? KILL_ANIM : ""}${reveal ? REVEAL : ""}\n}`);
  }

  if (m.reduceMotion || pri) {
    blocks.push(`@media (prefers-reduced-motion: reduce) {${KILL_ANIM}${REVEAL}\n}`);
  }

  if (blocks.length === 0) return "";
  return `\n/* mobile performance optimizations (injected by converter) */\n${blocks.join("\n")}\n`;
}

/** Insert the mobile-opt <style> as the last thing in <head> of a raw HTML string. */
export function injectMobileStyle(html: string, css: string): string {
  if (!css) return html;
  const tag = `<style data-mobile-opt>${css}</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${tag}</head>`);
  return tag + html;
}
