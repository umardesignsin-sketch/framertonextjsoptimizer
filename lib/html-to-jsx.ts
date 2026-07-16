// Convert a parsed HTML fragment (cheerio nodes) into real JSX source text.
// Used by the Pure Next.js exporter so pages are genuine React components,
// not raw HTML strings served through a route handler.
import type { AnyNode, Element, Text } from "domhandler";
import type { Doc } from "./parse";
import type { MotionAppearSpec } from "./appear";

// The only DOM attributes React requires camelCased. Everything else —
// including data-*, aria-*, and hyphenated SVG presentation attributes like
// stroke-width — is valid JSX syntax and passes straight through to the DOM.
const ATTR_MAP: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  autoplay: "autoPlay",
  playsinline: "playsInline",
  crossorigin: "crossOrigin",
  contenteditable: "contentEditable",
  novalidate: "noValidate",
  formnovalidate: "formNoValidate",
  allowfullscreen: "allowFullScreen",
  srcset: "srcSet",
  colspan: "colSpan",
  rowspan: "rowSpan",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  frameborder: "frameBorder",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  autocapitalize: "autoCapitalize",
  inputmode: "inputMode",
  enterkeyhint: "enterKeyHint",
  accesskey: "accessKey",
  hreflang: "hrefLang",
  radiogroup: "radioGroup",
  spellcheck: "spellCheck",
  datetime: "dateTime",
  itemscope: "itemScope",
  itemprop: "itemProp",
  itemtype: "itemType",
  itemref: "itemRef",
  itemid: "itemID",
};

// Attributes that are boolean in HTML (present = true) and must not be
// emitted as attr="" (empty string is falsy in JS and would disable them).
const BOOLEAN_ATTRS = new Set([
  "disabled",
  "checked",
  "selected",
  "required",
  "multiple",
  "hidden",
  "open",
  "defer",
  "async",
  "muted",
  "loop",
  "autoplay",
  "playsinline",
  "controls",
  "readonly",
  "novalidate",
  "formnovalidate",
  "allowfullscreen",
  "autofocus",
  "itemscope",
  "reversed",
  "ismap",
]);

// SVG presentation/geometry attributes React types as camelCase even though
// they're written lowercase in source HTML/SVG.
const SVG_CAMEL_MAP: Record<string, string> = {
  viewbox: "viewBox",
  preserveaspectratio: "preserveAspectRatio",
  cliprule: "clipRule",
  clippathunits: "clipPathUnits",
  fillrule: "fillRule",
  fillopacity: "fillOpacity",
  strokewidth: "strokeWidth",
  strokelinecap: "strokeLinecap",
  strokelinejoin: "strokeLinejoin",
  strokedasharray: "strokeDasharray",
  strokedashoffset: "strokeDashoffset",
  strokeopacity: "strokeOpacity",
  strokemiterlimit: "strokeMiterlimit",
  stopcolor: "stopColor",
  stopopacity: "stopOpacity",
  textanchor: "textAnchor",
  dominantbaseline: "dominantBaseline",
  fontfamily: "fontFamily",
  fontsize: "fontSize",
  fontweight: "fontWeight",
  gradienttransform: "gradientTransform",
  gradientunits: "gradientUnits",
  spreadmethod: "spreadMethod",
  patternunits: "patternUnits",
  patterncontentunits: "patternContentUnits",
  patterntransform: "patternTransform",
  markerwidth: "markerWidth",
  markerheight: "markerHeight",
  markerunits: "markerUnits",
  refx: "refX",
  refy: "refY",
  vectoreffect: "vectorEffect",
  xlinkhref: "xlinkHref",
};

// Attributes valid on virtually every HTML element (React's global
// HTMLAttributes) — safe to pass through unchanged regardless of tag.
const GLOBAL_SAFE_ATTRS = new Set([
  "id", "title", "lang", "dir", "role", "translate", "slot", "draggable",
  "xmlns", "color",
]);

// Attributes whose React type only exists on specific elements — keyed by
// lowercase tag name, so `name="…"` is only kept on the tags that actually
// support it (an <input>), not stripped/renamed on every element.
const TAG_SAFE_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel", "download", "ping"],
  img: ["src", "alt", "width", "height", "loading", "decoding", "sizes", "usemap"],
  source: ["src", "media", "sizes", "type"],
  video: ["src", "poster", "width", "height", "preload"],
  audio: ["src", "preload"],
  iframe: ["src", "width", "height", "allow", "sandbox", "loading", "referrerpolicy"],
  input: ["type", "name", "value", "placeholder", "min", "max", "step", "pattern", "list", "form", "size", "accept", "capture"],
  textarea: ["name", "placeholder", "form"],
  select: ["name", "form"],
  option: ["value", "label"],
  button: ["type", "name", "value", "form"],
  form: ["action", "method", "target"],
  label: ["form"],
  fieldset: ["name", "form"],
  output: ["name", "form"],
  meter: ["value", "min", "max", "low", "high", "optimum", "form"],
  progress: ["value", "max"],
  link: ["href", "rel", "as", "type", "sizes", "media", "integrity"],
  meta: ["name", "content", "property", "charset"],
  base: ["href", "target"],
  area: ["href", "alt", "coords", "shape", "target"],
  track: ["src", "kind", "srclang", "label", "default"],
  object: ["data", "type"],
  param: ["name", "value"],
  time: ["datetime"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polyline: ["points"],
  polygon: ["points"],
  path: ["d"],
  linearGradient: ["x1", "y1", "x2", "y2"],
  radialGradient: ["cx", "cy", "r", "fx", "fy"],
  stop: ["offset"],
};

// Presentation attributes shared across every SVG shape/container element.
const SVG_SAFE_ATTRS = new Set(["fill", "stroke", "opacity", "transform"]);
const SVG_TAGS = new Set([
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon",
  "text", "tspan", "defs", "symbol", "use", "clippath", "mask", "pattern",
  "lineargradient", "radialgradient", "stop", "filter", "marker",
]);

const VOID_LIKE_NO_TEXT = new Set(["style", "script"]); // never JSX-serialize children

// React types these as `number`, not `string` — passing the raw HTML string
// value through JSON.stringify would fail type-checking.
const NUMERIC_ATTRS = new Set([
  "tabindex",
  "maxlength",
  "minlength",
  "cols",
  "rows",
  "size",
  "span",
  "start",
  "colspan",
  "rowspan",
  "aria-posinset",
  "aria-setsize",
  "aria-level",
  "aria-valuemax",
  "aria-valuemin",
  "aria-valuenow",
  "aria-colcount",
  "aria-colindex",
  "aria-colspan",
  "aria-rowcount",
  "aria-rowindex",
  "aria-rowspan",
]);

const UNCONTROLLED_VALUE_TAGS = new Set(["input", "textarea", "select"]);

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z0-9])/gi, (_, c: string) => c.toUpperCase());
}

function cssPropToJs(prop: string): string {
  const p = prop.trim();
  if (p.startsWith("--")) return JSON.stringify(p);
  // Tolerate vendor prefixes with or without the leading dash — some
  // Framer-authored inline styles carry properties like "webkit-user-drag"
  // (no leading "-"), which would otherwise camelCase to a lowercase
  // "webkitUserDrag" that React doesn't recognize as the vendor property.
  const stripped = p.replace(/^-/, "");
  if (/^ms-/i.test(stripped)) return JSON.stringify("ms" + capitalize(kebabToCamel(stripped.slice(3))));
  if (/^(webkit|moz|o)-/i.test(stripped)) return JSON.stringify(capitalize(kebabToCamel(stripped)));
  return JSON.stringify(kebabToCamel(p));
}

/** "color:red;--x:1" -> `{"color":"red","--x":"1"}` (as JS source text). */
function styleAttrToJsxObject(styleStr: string): string {
  const decls = styleStr
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);
  const pairs: string[] = [];
  for (const decl of decls) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!prop) continue;
    pairs.push(`${cssPropToJs(prop)}:${JSON.stringify(value)}`);
  }
  return `{${pairs.join(",")}}`;
}

function jsxAttrName(name: string, tag: string): string {
  const lower = name.toLowerCase();
  const tagLower = tag.toLowerCase();
  if (ATTR_MAP[lower]) return ATTR_MAP[lower];
  if (SVG_CAMEL_MAP[lower]) return SVG_CAMEL_MAP[lower];
  // data-* / aria-* and any other hyphenated attribute (incl. SVG
  // presentation attrs like stroke-width) are valid JSX identifiers as-is.
  if (lower.includes("-")) return name;
  if (GLOBAL_SAFE_ATTRS.has(lower)) return name;
  if (TAG_SAFE_ATTRS[tagLower]?.includes(lower)) return name;
  if (SVG_TAGS.has(tagLower) && SVG_SAFE_ATTRS.has(lower)) return name;
  // Unrecognized, or valid only on a different element (Framer runtime
  // internals like parentsize/_constraints/rotation, or a real HTML
  // attribute name applied to a tag React doesn't type it for) — strict
  // typing rejects it outright either way. Namespace it under data-* to
  // keep the value in the DOM without breaking the build.
  return `data-${lower.replace(/^_+/, "")}`;
}

function dropOpacityTransform(styleStr: string): string {
  return styleStr
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d && !/^(opacity|transform)\s*:/i.test(d))
    .join(";");
}

/**
 * Drop opacity/transform declarations from a Framer element's SSR'd inline
 * style — its deliberately-hidden pre-animation state, e.g.
 * "opacity:0.001;transform:translateY(170px)". Two callers:
 *
 * (1) `force: true` — a Motion-matched element. Motion owns opacity/transform
 * unconditionally via initial/whileInView once matched, regardless of the
 * exact original value; leaving the old inline value in place would fight
 * Motion for control of the same style.
 *
 * (2) `force: false` (the default/safety-net path) — only strips when the
 * style shows Framer's specific "opacity:0.001" marker (a deliberately
 * near-zero value no legitimate design would use by coincidence). Covers two
 * cases where nothing else would ever reveal the element: an appear element
 * whose data *wasn't* found in motionMap (extraction is a best-effort
 * separate raw fetch — it can legitimately miss a page), and elements hidden
 * by an entirely different Framer mechanism with no data-framer-appear-id at
 * all — e.g. per-word/character text-stagger spans. Conservative on purpose:
 * an unrelated element with a real, intentional opacity/transform for
 * non-animation reasons is left alone.
 *
 * Either way, dropping the two properties falls back to the CSS default
 * (visible, untransformed) — no reveal animation for that element, but never
 * left stuck invisible.
 */
function stripAppearHiddenState(styleStr: string, force: boolean): string {
  if (force || /opacity:\s*0\.001\b/i.test(styleStr)) return dropOpacityTransform(styleStr);
  return styleStr;
}

function attrsToJsx(el: Element, hasMotionSpec = false): string {
  const out: string[] = [];
  for (const [rawName, rawValue] of Object.entries(el.attribs || {})) {
    if (rawName.startsWith("on")) continue; // no inline handlers in static output
    const lower = rawName.toLowerCase();
    // Consumed by nodeToJsx below to look up the element's Framer Motion
    // spec (see motionMap) — never itself rendered, whether or not a match
    // was found (unmatched ones are just dead Framer bookkeeping too).
    if (lower === "data-framer-appear-id") continue;
    if (lower === "style") {
      // `as CSSProperties`: Framer emits CSS custom properties (--token-...)
      // inline, which the DOM/React handle fine at runtime but aren't part of
      // React's built-in CSSProperties type — the cast keeps this real,
      // type-checked JSX instead of loosening to `any`.
      const value = stripAppearHiddenState(rawValue, hasMotionSpec);
      if (value.trim())
        out.push(`style={${styleAttrToJsxObject(value)} as CSSProperties}`);
      continue;
    }
    // Static output has no onChange handler — `value`/`checked` on a form
    // field makes React treat it as controlled, read-only (and warn). Use
    // the "default" variants instead so it behaves like the plain HTML it
    // came from.
    if (lower === "value" && UNCONTROLLED_VALUE_TAGS.has(el.tagName.toLowerCase())) {
      out.push(`defaultValue={${JSON.stringify(rawValue)}}`);
      continue;
    }
    if (lower === "checked" && el.tagName.toLowerCase() === "input") {
      out.push(`defaultChecked`);
      continue;
    }
    const name = jsxAttrName(rawName, el.tagName);
    if (BOOLEAN_ATTRS.has(lower) && (rawValue === "" || rawValue === lower)) {
      out.push(name);
      continue;
    }
    if (NUMERIC_ATTRS.has(lower) && /^-?\d+$/.test(rawValue)) {
      out.push(`${name}={${Number(rawValue)}}`);
      continue;
    }
    out.push(`${name}={${JSON.stringify(rawValue)}}`);
  }
  return out.length ? " " + out.join(" ") : "";
}

function escapeJsxText(text: string): string {
  if (!text) return "";
  // Any text containing JSX-special chars is safest emitted as a JS string
  // expression; plain text can be written verbatim. `<` would otherwise be
  // parsed as the start of a new tag (e.g. literal "<!doctype html>" shown as
  // page copy), and a bare `>` is a syntax error in JSX text.
  if (/[{}<>]/.test(text)) {
    return `{${JSON.stringify(text)}}`;
  }
  return text;
}

/** Render a <style> or <script> element's raw text child via dangerouslySetInnerHTML. */
function rawTextElement($: Doc, el: Element): string {
  const text = $(el).html() || "";
  const attrs = attrsToJsx(el);
  return `<${el.tagName}${attrs} dangerouslySetInnerHTML={{ __html: ${JSON.stringify(text)} }} />`;
}

/** `initial`/`whileInView`/`viewport`/`transition` props for a matched appear spec. */
function motionPropsJsx(spec: MotionAppearSpec): string {
  const t = spec.transition;
  const transitionFields: string[] = [];
  if (t.type) transitionFields.push(`type:${JSON.stringify(t.type)}`);
  if (t.duration != null) transitionFields.push(`duration:${t.duration}`);
  if (t.delay) transitionFields.push(`delay:${t.delay}`);
  if (t.bounce != null) transitionFields.push(`bounce:${t.bounce}`);
  if (t.ease) transitionFields.push(`ease:${JSON.stringify(t.ease)}`);
  return (
    ` initial={${JSON.stringify(spec.initial)}}` +
    ` whileInView={${JSON.stringify(spec.animate)}}` +
    ` viewport={{ once: true, amount: 0.2 }}` +
    ` transition={{${transitionFields.join(",")}}}`
  );
}

/**
 * Serialize a node to JSX. When `motionMap` is given and the node carries a
 * data-framer-appear-id matching an entry, it's emitted as a real
 * `motion.<tag>` component with Framer's actual authored initial/animate/
 * transition values (via Framer Motion) instead of a plain tag — real
 * scroll-reveal animation, not a runtime or CSS approximation. `usedMotion`,
 * if given, gets a "motion" entry added whenever this happens, so the caller
 * knows to import it.
 */
function nodeToJsx(
  $: Doc,
  node: AnyNode,
  motionMap?: Map<string, MotionAppearSpec>,
  usedMotion?: Set<string>
): string {
  if (node.type === "text") {
    return escapeJsxText((node as Text).data);
  }
  if (node.type === "comment") {
    return ""; // drop HTML comments; not meaningful in static output
  }
  if (node.type !== "tag" && node.type !== "script" && node.type !== "style") {
    return "";
  }
  const el = node as Element;
  const tag = el.tagName;
  if (VOID_LIKE_NO_TEXT.has(tag)) {
    return rawTextElement($, el);
  }

  const animId = el.attribs?.["data-framer-appear-id"];
  const spec = animId && motionMap ? motionMap.get(animId) : undefined;
  const effectiveTag = spec ? `motion.${tag}` : tag;
  if (spec) usedMotion?.add("motion");

  const attrs = attrsToJsx(el, !!spec) + (spec ? motionPropsJsx(spec) : "");
  const children = el.children || [];
  if (children.length === 0) {
    return `<${effectiveTag}${attrs} />`;
  }
  const inner = children.map((c) => nodeToJsx($, c, motionMap, usedMotion)).join("");
  return `<${effectiveTag}${attrs}>${inner}</${effectiveTag}>`;
}

/** Convert every child node of `el` (or the root) into a single JSX fragment string. */
export function nodesToJsx(
  $: Doc,
  nodes: AnyNode[],
  motionMap?: Map<string, MotionAppearSpec>,
  usedMotion?: Set<string>
): string {
  return nodes.map((n) => nodeToJsx($, n, motionMap, usedMotion)).join("");
}

export interface ExtractedSection {
  name: string;
  jsx: string;
  usesMotion: boolean;
}

function pascalName(raw: string, fallbackIndex: number): string {
  const words = raw.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const pascal = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  return pascal && /^[A-Za-z]/.test(pascal) ? pascal : `Section${fallbackIndex}${pascal}`;
}

/** Cheap non-cryptographic hash, good enough for exact-content dedup within one site. */
function contentHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h.toString(36) + ":" + s.length;
}

/**
 * Serialize `nodes` into JSX, but split off a real component instead of
 * inlining wherever a Framer-named boundary (`data-section-name` — renamed
 * from Framer's `data-framer-name`, e.g. "Hero", "Footer", "Desktop Nav") is
 * found — mirroring how a human would break a
 * page into Header/Hero/Footer files rather than one flat blob. Unnamed
 * wrapper divs (layout containers with no Framer name) stay inline so their
 * flex/grid positioning of the named children is preserved. Extraction goes
 * exactly one level deep: content inside an extracted section is serialized
 * plainly (via nodeToJsx), not further split, to avoid fragmenting into
 * hundreds of tiny files.
 *
 * `registry`/`usedNames` are shared across an entire site's pages so
 * identical sections (the same nav/footer repeated on every page) resolve to
 * one deduplicated component instead of being duplicated per page.
 */
// How many levels of unnamed wrapper we'll descend through hunting for a
// named boundary before giving up and inlining the rest. Real top-level page
// sections (Hero, Footer, Sidebar) sit within a few hops of the body/#main
// root; without this cap, deeply-nested content (e.g. named sub-layers of an
// imported SVG illustration — "M7", "Gradient", "Pattern") gets mistaken for
// page sections and fragmented into dozens of meaningless component files.
const MAX_SEARCH_DEPTH = 4;

export function extractSections(
  $: Doc,
  nodes: AnyNode[],
  registry: Map<string, ExtractedSection>,
  usedNames: Map<string, string>,
  pageRefs: Set<string>,
  motionMap?: Map<string, MotionAppearSpec>,
  pageMotion?: Set<string>,
  depth = 0
): string {
  return nodes
    .map((node) => extractNode($, node, registry, usedNames, pageRefs, motionMap, pageMotion, depth))
    .join("");
}

function extractNode(
  $: Doc,
  node: AnyNode,
  registry: Map<string, ExtractedSection>,
  usedNames: Map<string, string>,
  pageRefs: Set<string>,
  motionMap: Map<string, MotionAppearSpec> | undefined,
  pageMotion: Set<string> | undefined,
  depth: number
): string {
  if (node.type === "text") return escapeJsxText((node as Text).data);
  if (node.type === "comment") return "";
  if (node.type !== "tag" && node.type !== "script" && node.type !== "style") return "";
  const el = node as Element;
  if (VOID_LIKE_NO_TEXT.has(el.tagName)) return rawTextElement($, el);

  // The Pure Next.js exporter renames Framer's data-framer-name attribute to
  // data-section-name before calling this (see nextjs-export.ts) — read the
  // renamed key.
  const framerName = el.attribs?.["data-section-name"];
  const animId = el.attribs?.["data-framer-appear-id"];
  const hasMotionSpec = !!(animId && motionMap?.has(animId));

  // SVG internals (paths, masks, gradient defs, named illustration layers)
  // are one visual unit — never split THEM into separate components — unless
  // the <svg> root itself carries its own motion spec, in which case it
  // needs the same client-component extraction as anything else below.
  if (el.tagName === "svg" && !hasMotionSpec) return nodeToJsx($, node, motionMap, pageMotion);

  // A named Framer boundary extracts (bounded by search depth, so unnamed
  // wrapper chains don't fragment forever); an element with its own Framer
  // Motion animation ALWAYS extracts regardless of depth — motion.* is a
  // client component, which needs its own "use client" file. Inlining it
  // straight into a Server Component (the page, or an unnamed wrapper's own
  // extracted section) breaks Next.js's RSC bundling, and page.tsx itself
  // can't be marked "use client" without losing its `metadata` export.
  const namedBoundary = !!(framerName && framerName.trim() && depth <= MAX_SEARCH_DEPTH);
  if (namedBoundary || hasMotionSpec) {
    const label = namedBoundary ? framerName! : "Animated";
    const sectionMotion = new Set<string>();
    const fullJsx = nodeToJsx($, node, motionMap, sectionMotion);
    const hash = contentHash(fullJsx);
    let section = registry.get(hash);
    if (!section) {
      let name = pascalName(label, registry.size + 1);
      let suffix = 2;
      while (usedNames.has(name) && usedNames.get(name) !== hash) {
        name = `${pascalName(label, registry.size + 1)}${suffix++}`;
      }
      usedNames.set(name, hash);
      section = { name, jsx: fullJsx, usesMotion: sectionMotion.size > 0 };
      registry.set(hash, section);
    }
    pageRefs.add(section.name);
    return `<${section.name} />`;
  }

  // Unnamed wrapper (no Framer layer name, no motion spec of its own) — keep
  // inline to preserve its own layout styling, and keep looking through its
  // children. Recursion continues past MAX_SEARCH_DEPTH (only *named*-boundary
  // extraction is capped, via the `namedBoundary` depth check above) — a
  // motion-matched descendant must still get its own client-component file no
  // matter how deep it sits, since inlining it here would leak a client
  // component into whatever Server Component contains this wrapper.
  const attrs = attrsToJsx(el);
  const children = el.children || [];
  if (children.length === 0) return `<${el.tagName}${attrs} />`;
  const inner = extractSections($, children, registry, usedNames, pageRefs, motionMap, pageMotion, depth + 1);
  return `<${el.tagName}${attrs}>${inner}</${el.tagName}>`;
}
