// Consumes an optional "Framer Intelligence" extraction.json — produced by a
// separate Playwright-based tool that actually runs a Framer site in a real
// browser and records real computed-style before/after diffs, WAAPI
// keyframes, and scroll-linked transform fits for hover/tap/parallax
// interactions. Framer's own runtime implements these entirely in JS with no
// static CSS to parse (verified empirically — see nextjs-export.ts's normal
// static-only path, which cannot reproduce them at all), so this is the only
// way to recover them short of re-implementing Framer's runtime.
//
// Correlation strategy: extraction.json's elements carry Framer's own
// generated class names (framer-XXXX), which nextjs-export.ts deliberately
// never renames — so an element found during extraction can be re-identified
// in the generated output by its non-variant class set ("fingerprint")
// without needing a shared ID scheme. Not every extracted element resolves
// this way (breakpoint variants not present in a given static snapshot,
// elements Framer only creates at runtime, etc.) — unresolvable entries are
// silently skipped rather than guessed at.

export interface ExtractionElement {
  id: string;
  page: string;
  classes?: string[];
}

export interface ExtractionData {
  elements: ExtractionElement[];
  hoverEffects: HoverEffect[];
  scrollTransforms: ScrollTransform[];
  parallax: ParallaxEffect[];
}

interface HoverEffect {
  elementId: string;
  page: string;
  before: Record<string, string>;
  after: Record<string, string>;
  changedNodes?: { id: string; changes?: Record<string, [string, string]> }[];
  waapiAnimations?: {
    id: string;
    keyframes: Record<string, [number, number] | [string, string]>;
    options: { duration: number; easing: string; delay: number };
  }[];
}

interface ScrollTransform {
  elementId: string;
  page: string;
  property: string;
  fit: { slope: number; intercept: number; r2: number };
}

interface ParallaxEffect {
  elementId: string;
  page: string;
  axis: "x" | "y";
  mapping: { input: [number, number]; output: [number, number] };
}

export function parseExtraction(raw: string): ExtractionData {
  const data = JSON.parse(raw);
  if (!Array.isArray(data.elements) || !Array.isArray(data.hoverEffects)) {
    throw new Error("Not a recognized extraction.json (missing elements/hoverEffects arrays)");
  }
  return data as ExtractionData;
}

/** Framer's own generated classes, excluding per-breakpoint variant overrides (framer-v-*) and SSR bookkeeping. */
function stableClasses(classes: string[] | undefined): string[] {
  return (classes ?? []).filter(
    (c) => c.startsWith("framer-") && !c.startsWith("framer-v-")
  );
}

/**
 * Framer mixes two kinds of class in the same list: per-component identity
 * classes (random-looking base62 strings like "framer-beB1M") and shared
 * utility/preset classes ("framer-text", "framer-styles-preset-<id>",
 * "framer-form-*") applied to every element of a given kind site-wide.
 * Identity classes are safe to select on even when they repeat often — that
 * repetition just means the same component (e.g. one nav-link component
 * used for Home/Works/Services/…) is instantiated many times, and applying
 * the same real hover choreography to every instance of one component is
 * correct, not a leak. Utility classes are never safe: keying a selector on
 * "framer-text" would apply an effect captured from ONE link to every text
 * node on the site regardless of what it is. Distinguished by name pattern,
 * not frequency — frequency alone can't tell "one component, many
 * instances" apart from "everything, because it's a utility class"
 * (verified empirically: the reused nav-link identity classes and the true
 * utility classes land in overlapping frequency ranges).
 */
const GENERIC_CLASS_PATTERNS = [/^framer-text$/, /^framer-styles-preset-/, /^framer-form-/];
function specificClasses(classes: string[] | undefined): string[] {
  return stableClasses(classes).filter((c) => !GENERIC_CLASS_PATTERNS.some((re) => re.test(c)));
}

function cssSelector(classes: string[]): string | null {
  if (!classes.length) return null;
  // Framer class names are always plain [A-Za-z0-9_-] (verified: they're
  // either "framer-<base62 hash>" or "framer-<slug>-container"), so a full
  // CSS.escape (browser-only, unavailable in this Node runtime) isn't
  // needed — just guard against anything unexpected slipping through.
  return "." + classes.map((c) => c.replace(/[^a-zA-Z0-9_-]/g, "")).join(".");
}

/** Does every one of these classes actually appear somewhere in the generated output? Guards against dead/mismatched selectors. */
function resolvable(classes: string[], haystack: string): boolean {
  return classes.length > 0 && classes.every((c) => haystack.includes(c));
}

const STYLE_KEYS_TO_SKIP = new Set(["rect"]);

function styleDiff(before: Record<string, string>, after: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(after)) {
    if (STYLE_KEYS_TO_SKIP.has(k) || k === "rect") continue;
    if (before[k] !== v) out[k] = v;
  }
  return out;
}

function cssPropsBlock(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}

/**
 * Build a global CSS block reproducing real captured hover deltas as actual
 * `:hover` rules — the trigger element's own diffed properties, plus any
 * nested "changed nodes" (Framer commonly swaps in a second text/icon layer
 * on hover rather than animating the trigger itself). Real WAAPI-captured
 * duration/easing is used per node when present; otherwise a synthesized
 * transition is applied, since Framer's hover choreography is spring/JS
 * driven and virtually never has a real CSS transition-duration to recover
 * (confirmed empirically: 0/663 changed-node transitions had a nonzero
 * captured duration).
 */
export function buildHoverCss(extraction: ExtractionData, generatedText: string): string {
  const byKey = new Map<string, ExtractionElement>();
  for (const el of extraction.elements) byKey.set(`${el.page}|${el.id}`, el);

  // Keyed by selector pair, first-wins: a component reused many times site-
  // wide (e.g. one nav-link component behind Home/Works/Services/…) gets
  // captured once per instance, all resolving to the identical selector —
  // emitting every one of those as its own competing rule is pure bloat and
  // leaves the winning value to arbitrary CSS cascade/specificity order
  // rather than an intentional choice (confirmed empirically: 17 near-
  // duplicate captures of one interaction, differing only by sub-pixel
  // measurement jitter, cascaded down to a value nobody chose).
  const rules = new Map<string, string>();
  for (const h of extraction.hoverEffects) {
    const trigger = byKey.get(`${h.page}|${h.elementId}`);
    if (!trigger) continue;
    const triggerClasses = specificClasses(trigger.classes);
    if (!resolvable(triggerClasses, generatedText)) continue;
    const triggerSelector = cssSelector(triggerClasses);
    if (!triggerSelector) continue;

    const ownDiff = styleDiff(h.before, h.after);
    if (Object.keys(ownDiff).length && !rules.has(triggerSelector)) {
      rules.set(triggerSelector, `${triggerSelector}:hover { ${cssPropsBlock(ownDiff)} transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }`);
    }

    const waapiByNode = new Map((h.waapiAnimations ?? []).map((w) => [w.id, w]));
    for (const cn of h.changedNodes ?? []) {
      const childEl = byKey.get(`${h.page}|${cn.id}`);
      if (!childEl || !cn.changes) continue;
      const childClasses = specificClasses(childEl.classes);
      if (!resolvable(childClasses, generatedText)) continue;
      const childSelector = cssSelector(childClasses);
      if (!childSelector) continue;
      const pairKey = `${triggerSelector}>>${childSelector}`;
      if (rules.has(pairKey)) continue;

      const props: Record<string, string> = {};
      for (const [prop, [, after]] of Object.entries(cn.changes)) props[prop] = after;
      if (!Object.keys(props).length) continue;

      const waapi = waapiByNode.get(cn.id);
      const transition = waapi
        ? `transition: ${Object.keys(props).join(", ")} ${waapi.options.duration}ms ${waapi.options.easing};`
        : `transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;`;

      rules.set(pairKey, `${triggerSelector}:hover ${childSelector} { ${cssPropsBlock(props)} ${transition} }`);
    }
  }
  if (!rules.size) return "";
  return `/* Recovered from Framer runtime hover interactions (extraction.json) */\n${[...rules.values()].join("\n")}`;
}

export interface ScrollFxTarget {
  page: string;
  classes: string[];
  property: string;
  slope: number;
  intercept: number;
}

/** Linear scroll-position -> transform mappings (parallax, scroll-linked transforms), keyed by resolvable element for DOM attribute injection. */
export function buildScrollFxTargets(extraction: ExtractionData, generatedText: string): ScrollFxTarget[] {
  const byKey = new Map<string, ExtractionElement>();
  for (const el of extraction.elements) byKey.set(`${el.page}|${el.id}`, el);

  const seen = new Set<string>();
  const out: ScrollFxTarget[] = [];

  const add = (page: string, elementId: string, property: string, slope: number, intercept: number) => {
    const key = `${page}|${elementId}|${property}`;
    if (seen.has(key)) return;
    const el = byKey.get(`${page}|${elementId}`);
    if (!el) return;
    const classes = specificClasses(el.classes);
    if (!resolvable(classes, generatedText)) return;
    seen.add(key);
    out.push({ page, classes, property, slope, intercept });
  };

  for (const st of extraction.scrollTransforms) {
    add(st.page, st.elementId, st.property, st.fit.slope, st.fit.intercept);
  }
  for (const p of extraction.parallax) {
    const [x0, x1] = p.mapping.input;
    const [y0, y1] = p.mapping.output;
    const slope = x1 === x0 ? 0 : (y1 - y0) / (x1 - x0);
    const intercept = y0 - slope * x0;
    add(p.page, p.elementId, p.axis === "y" ? "translateY" : "translateX", slope, intercept);
  }
  return out;
}
