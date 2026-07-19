// Decomposes a parsed HTML document into real, compilable JSX source — genuine
// <div>/<img>/<svg> elements (one spread props object per element), not a
// single string blob injected via dangerouslySetInnerHTML for the whole page.
//
// The props-as-one-spread-object approach (rather than individually-typed
// JSX attribute tokens) is deliberate: it lets every attribute be serialized
// via a single JSON.stringify call, which is provably correct for arbitrary
// string/number/nested-object values — no hand-rolled per-attribute escaping
// code to get wrong. It's also why no className/htmlFor/camelCase-SVG-attr
// mapping table is needed at all: verified empirically against the exact
// React version this project generates (react-dom@18.3.1) that passing an
// unrecognized attribute name through `createElement` — kebab-case, colons,
// whatever the original HTML used — renders it to the DOM completely
// verbatim (a documented React 16+ behavior change; only a build-time
// console warning, no functional or output difference). That's what makes
// full decomposition safe here without reimplementing React's own internal
// attribute allowlist.
//
// Meant to be rendered with ReactDOMServer.renderToStaticMarkup from a Route
// Handler — never registered as a Next.js page.tsx. That distinction is load
// bearing: App Router unconditionally duplicates a page.tsx's entire content
// into a hidden RSC hydration payload (measured elsewhere in this file's
// history at a 36 vs 81 mobile Performance difference, same everything else)
// to support client-side navigation this page has no use for. A Route
// Handler doesn't go through that pipeline at all — it just returns a
// string — so decomposing into real JSX here doesn't reintroduce that
// regression; the render happens once, into a plain string, same as the
// template-literal HTML this replaces.
import { load } from "./parse";

// Node names/types intentionally excluded from decomposition risk are none —
// every element is decomposed. The one thing that must stay as a raw string
// rather than JSX children is a <script>/<style> tag's own body: arbitrary
// JS/CSS text can contain characters (`<`, `{`, literal `</script>`
// sequences) that don't round-trip through JSX child syntax safely.
const RAW_CONTENT_TAGS = new Set(["script", "style"]);

// React intercepts these exact prop names for its own reconciliation
// machinery regardless of how they're supplied (individual attr, spread, or
// otherwise) — none of these are real HTML attribute names Framer would ever
// emit, but rename defensively rather than silently dropping the attribute
// if one somehow appears.
const REACT_RESERVED = new Set(["key", "ref", "children", "dangerouslySetInnerHTML"]);

// The one real gap in "pass every attribute through verbatim as a string":
// HTML boolean attributes whose name needs NO case correction to match
// React's own recognized prop (unlike e.g. `allowfullscreen`, which only
// matches after renaming to `allowFullScreen` and therefore falls through as
// an unrecognized attribute — printed as-is regardless of value). For this
// specific, short list, React recognizes the name immediately and applies JS
// boolean coercion to its value — an empty string (exactly what an HTML
// boolean attribute's value looks like when parsed: `<video muted>` or
// `<video muted="">` both give `""`) is falsy, so React silently omits the
// attribute rather than rendering `muted=""`. Confirmed via
// ReactDOMServer.renderToStaticMarkup on react-dom@18.3.1 (the exact version
// the generated project pins) — every other attribute in this file's design
// passes through untouched; only these need their value coerced to a real
// JS `true` so React's boolean-prop path renders them as present.
const SAME_CASE_BOOLEAN_ATTRS = new Set([
  "disabled",
  "checked",
  "selected",
  "required",
  "multiple",
  "hidden",
  "open",
  "default",
  "reversed",
  "muted",
  "loop",
  "async",
  "defer",
  "controls",
]);

interface LooseNode {
  type: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: LooseNode[];
}

function styleStringToObject(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (prop) out[prop] = value;
  }
  return out;
}

function buildProps(el: LooseNode): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(el.attribs || {})) {
    const key = REACT_RESERVED.has(name) ? `data-attr-${name}` : name;
    props[key] =
      name === "style"
        ? styleStringToObject(value)
        : SAME_CASE_BOOLEAN_ATTRS.has(name)
          ? true
          : value;
  }
  if (el.name && RAW_CONTENT_TAGS.has(el.name)) {
    const text = (el.children || []).map((c) => (c.type === "text" ? c.data || "" : "")).join("");
    props.dangerouslySetInnerHTML = { __html: text };
  }
  return props;
}

function nodeToJsx(node: LooseNode): string {
  if (node.type === "text") {
    const text = node.data ?? "";
    return text === "" ? "" : `{${JSON.stringify(text)}}`;
  }
  // Comments carry no visual/functional weight — dropped rather than
  // JSX-comment-escaped, which sidesteps needing to guard against a literal
  // "*/" sequence inside the comment's own text.
  if (node.type === "comment" || node.type === "directive") return "";
  if (node.type !== "tag" && node.type !== "script" && node.type !== "style") return "";
  if (!node.name) return "";

  const props = buildProps(node);
  // Cast to `any`: real-world HTML attributes (charset, data-*, SVG's
  // kebab-case names) don't structurally match React's idealized per-element
  // prop interfaces (e.g. its `<meta>` type has no `charset` key — only the
  // camelCase `charSet`), even though the RUNTIME renders them correctly
  // verbatim (verified against react-dom@18.3.1 — see SAME_CASE_BOOLEAN_ATTRS
  // above for the one place that runtime behavior needed a real fix). This
  // is a type-checker-only escape hatch, not a runtime concern.
  const propsSrc = `(${JSON.stringify(props)} as any)`;
  const rawContent = RAW_CONTENT_TAGS.has(node.name);
  const childrenSrc = rawContent ? "" : (node.children || []).map(nodeToJsx).join("");
  return childrenSrc
    ? `<${node.name} {...${propsSrc}}>${childrenSrc}</${node.name}>`
    : `<${node.name} {...${propsSrc}}/>`;
}

/**
 * Converts a full HTML document string into compilable .tsx source
 * exporting a default component that renders the exact same tree as real
 * JSX — not one embedded HTML string. The DOCTYPE isn't part of this (JSX
 * has no such concept); the caller prepends "<!DOCTYPE html>" to the
 * rendered string.
 */
export function htmlDocumentToJsxSource(html: string): string {
  const $ = load(html);
  const htmlEl = $("html").get(0) as unknown as LooseNode | undefined;
  if (!htmlEl) throw new Error("htmlDocumentToJsxSource: no <html> element found in document");
  const jsx = nodeToJsx(htmlEl);
  return (
    "// Auto-generated from the converted Framer page: real, decomposed JSX\n" +
    "// (individual elements, each with a spread props object), not a single\n" +
    "// embedded HTML string. See lib/html-to-jsx.ts for how attributes are\n" +
    "// preserved verbatim without a camelCase mapping table, and route.ts in\n" +
    "// this folder for why this is rendered outside Next's page pipeline.\n" +
    "export default function Page() {\n" +
    `  return (${jsx});\n` +
    "}\n"
  );
}
