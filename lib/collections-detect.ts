// Framer CMS Collection detection.
//
// Framer's CMS Collections feature (a blog with N post pages, a portfolio
// with N project pages) produces N routes sharing one template but differing
// in a handful of fields (title, body, hero image, date...). This module
// detects that pattern from the ALREADY-CONVERTED bundle's HTML — there is no
// access to Framer's own project metadata, so this is a structural-similarity
// heuristic, not a certainty. See the honest-limitations note at the bottom.
//
// Runs once, at conversion time, on the in-memory ConvertReport — no new
// fetching. Hybrid mode only (see lib/nextjs-export.ts's byte-exact-string
// constraint for why Pure Next.js isn't a fit for this in v1).
import { load, type Doc } from "./parse";
import { normalizeRoute, routeToFilePath } from "./discover";
import type { ConvertReport } from "./types";
import type { Element } from "domhandler";

export interface FieldSlot {
  /** Stable key within the collection, e.g. "title", "heroImage", "field_2". */
  key: string;
  /** Editor form label, e.g. "Title". */
  label: string;
  type: "text" | "richtext" | "image" | "date" | "url";
  /** "head" = <title>/<meta>/<link rel=canonical>; "body" = everything else. */
  scope: "body" | "head";
  /** Child-index chain from <body> (or a head selector index) to the node. */
  path: number[];
  /** Attribute name for non-text types ("src" | "href" | "content"). */
  attr?: string;
  /** First framer-xxxx class on the node, if any — defensive fallback locator. */
  cssHint?: string;
}

export interface DetectedCollectionItem {
  route: string;
  slug: string;
  fields: Record<string, string>;
}

export interface DetectedCollection {
  routePrefix: string;
  name: string;
  templateSourcePath: string;
  fields: FieldSlot[];
  confidence: number;
  listingRoute: string | null;
  items: DetectedCollectionItem[];
}

const MIN_CARDINALITY = 3;
const MIN_CONFIDENCE = 0.85;
const RICHTEXT_TEXT_LEN = 200;

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function slugFromRoute(route: string, prefix: string): string {
  const rest = route.slice(prefix.length).replace(/^\/+/, "");
  return rest || route.replace(/^\/+/, "");
}

function cssHintOf(el: Element): string | undefined {
  return (el.attribs?.class || "")
    .split(/\s+/)
    .find((c) => /^framer-[A-Za-z0-9]+$/.test(c));
}

const DATE_HINT_RE = /date|publish|time/i;
const DATE_TEXT_RE = /\b(19|20)\d{2}\b/;

function looksLikeDate(el: Element, text: string): boolean {
  if (el.tagName === "time" && el.attribs?.datetime) return true;
  const cls = el.attribs?.class || "";
  const id = el.attribs?.id || "";
  if (DATE_HINT_RE.test(cls) || DATE_HINT_RE.test(id)) return DATE_TEXT_RE.test(text) || text.length < 40;
  return false;
}

/** One aligned instance of a divergence point: which member it came from + its node. */
interface MemberNode {
  route: string;
  $: Doc;
  el: Element;
}

interface Divergence {
  path: number[];
  nodes: MemberNode[];
}

function attrsEqualAll(nodes: MemberNode[]): boolean {
  const base = nodes[0].el.attribs || {};
  const baseKeys = Object.keys(base).sort();
  return nodes.every((n) => {
    const a = n.el.attribs || {};
    const keys = Object.keys(a).sort();
    if (keys.length !== baseKeys.length) return false;
    return baseKeys.every((k, i) => keys[i] === k && a[k] === base[k]);
  });
}

/** Count of all element + text descendant nodes (incl. self) under `el`. Used
 *  post-hoc to weigh divergences by how much of the tree they actually cover
 *  — NOT tracked during walk() itself, since walk() only ever recurses into
 *  children that already differ; fully-identical subtrees (nav, footer, all
 *  the unchanging chrome around the one card that varies) are never visited
 *  by walk() at all, so counting "recursive calls made" would massively
 *  undercount how much of the page is actually shared/matching. */
function countNodes(el: Element): number {
  let n = 1;
  for (const child of el.children || []) {
    n += child.type === "tag" ? countNodes(child as Element) : 1;
  }
  return n;
}

/**
 * N-way generalization of overrides.ts's pairwise walk(): walks all member
 * <body> trees in lockstep, recording the smallest changed subtree at each
 * divergence. Mirrors that function's "same"/"self"/"handled" shape exactly
 * (attribute VALUE differences, not just key-set differences, make a node
 * "self" immediately — this is what lets a single changed <img src> or <a
 * href> become its own leaf divergence instead of forcing a parent-level one).
 */
function walk(nodes: MemberNode[], path: number[], out: Divergence[]): "same" | "handled" | "self" {
  const htmls = nodes.map((n) => n.$.html(n.el));
  if (htmls.every((h) => h === htmls[0])) return "same";

  const tags = nodes.map((n) => n.el.tagName);
  if (!tags.every((t) => t === tags[0]) || !attrsEqualAll(nodes)) return "self";

  const childArrays = nodes.map((n) => (n.el.children || []) as Element[]);
  const lengths = childArrays.map((c) => c.length);
  if (!lengths.every((l) => l === lengths[0])) return "self";

  const numChildren = lengths[0];
  const diffIdx: number[] = [];
  for (let i = 0; i < numChildren; i++) {
    const childHtmls = nodes.map((n, ni) => {
      const child = childArrays[ni][i];
      return child.type === "tag" ? n.$.html(child) : (child as unknown as { data?: string }).data || "";
    });
    if (!childHtmls.every((h) => h === childHtmls[0])) diffIdx.push(i);
  }
  if (diffIdx.length === 0) return "same";

  // Any changed non-element child (a text node) -> can't isolate further, this whole node is the divergence.
  const hasNonTagDiff = diffIdx.some((i) => childArrays.some((arr) => arr[i]?.type !== "tag"));
  if (hasNonTagDiff) return "self";

  for (const i of diffIdx) {
    const childNodes: MemberNode[] = nodes.map((n, ni) => ({ route: n.route, $: n.$, el: childArrays[ni][i] }));
    const r = walk(childNodes, [...path, i], out);
    if (r === "self") out.push({ path: [...path, i], nodes: childNodes });
  }
  return "handled";
}

/** Classify one divergence into a field slot, or null if it's not a reliable single field. */
function classifyDivergence(fieldIndex: number, div: Divergence): FieldSlot | null {
  const first = div.nodes[0].el;
  const tag = first.tagName;
  const cssHint = cssHintOf(first);
  const path = div.path;

  if (tag === "img") {
    const srcs = div.nodes.map((n) => n.el.attribs?.src || "");
    if (new Set(srcs).size > 1) {
      return { key: `field_${fieldIndex}`, label: "Image", type: "image", scope: "body", path, attr: "src", cssHint };
    }
    return null;
  }

  const texts = div.nodes.map((n) => norm(n.$(n.el).text()));
  const textsDiffer = new Set(texts).size > 1;
  const hasNestedTags = div.nodes.some((n) => (n.el.children || []).some((c) => c.type === "tag"));

  if (textsDiffer) {
    if (looksLikeDate(first, texts[0])) {
      return { key: `field_${fieldIndex}`, label: "Date", type: "date", scope: "body", path, cssHint };
    }
    if (!hasNestedTags && texts.every((t) => t.length < RICHTEXT_TEXT_LEN)) {
      return { key: `field_${fieldIndex}`, label: "Text", type: "text", scope: "body", path, cssHint };
    }
    return { key: `field_${fieldIndex}`, label: "Body", type: "richtext", scope: "body", path, cssHint };
  }

  // Text identical across instances but something else differs — an attribute swap.
  if (tag === "a") {
    const hrefs = div.nodes.map((n) => n.el.attribs?.href || "");
    if (new Set(hrefs).size > 1) {
      return { key: `field_${fieldIndex}`, label: "Link", type: "url", scope: "body", path, attr: "href", cssHint };
    }
  }

  // Multiple/unrelated attributes differing with no clear single-attribute
  // signal, or a content-identical structural quirk — not a reliable field.
  return null;
}

function valueForField(field: FieldSlot, node: MemberNode): string {
  if (field.attr) return node.el.attribs?.[field.attr] || "";
  if (field.type === "richtext") return node.$(node.el).html() || "";
  return norm(node.$(node.el).text());
}

const HEAD_SELECTORS: { key: string; label: string; selector: string; attr?: string }[] = [
  { key: "seoTitle", label: "SEO title", selector: "title" },
  { key: "seoDescription", label: "SEO description", selector: 'meta[name="description"]', attr: "content" },
  { key: "ogTitle", label: "Social title", selector: 'meta[property="og:title"]', attr: "content" },
  { key: "ogDescription", label: "Social description", selector: 'meta[property="og:description"]', attr: "content" },
  { key: "canonical", label: "Canonical URL", selector: 'link[rel="canonical"]', attr: "href" },
];

function headFieldsAndItems(
  members: { route: string; $: Doc }[]
): { fields: FieldSlot[]; values: Record<string, Record<string, string>> } {
  const fields: FieldSlot[] = [];
  const values: Record<string, Record<string, string>> = {};
  for (const m of members) values[m.route] = {};

  HEAD_SELECTORS.forEach((h, idx) => {
    const perMember = members.map((m) => {
      const el = m.$(h.selector).first();
      return h.attr ? el.attr(h.attr) || "" : norm(el.text());
    });
    if (new Set(perMember).size <= 1) return; // identical (or all empty) across every member — not a field
    fields.push({
      key: h.key,
      label: h.label,
      type: "text",
      scope: "head",
      path: [idx],
      attr: h.attr,
    });
    members.forEach((m, i) => {
      values[m.route][h.key] = perMember[i];
    });
  });

  return { fields, values };
}

/**
 * Detects Framer CMS Collections in an already-converted (Hybrid mode)
 * ConvertReport. Deliberately conservative: on any ambiguity, skips the
 * candidate rather than guessing — a missed collection behaves exactly like
 * today (flat independent pages); a wrongly-accepted one would surface a
 * bogus, confusing CMS entry, which is the worse failure mode.
 */
export function detectCollections(
  report: ConvertReport,
  onDiagnostic?: (msg: string) => void
): DetectedCollection[] {
  const diag = onDiagnostic || (() => {});
  const fileByPath = new Map(report.files.map((f) => [f.path, f]));
  const routeSet = new Set(report.pages.map((p) => normalizeRoute(p.route)));

  // Phase A: group by parent prefix (all segments but the last), depth >= 2.
  const groups = new Map<string, string[]>();
  for (const page of report.pages) {
    const route = normalizeRoute(page.route);
    const segments = route.split("/").filter(Boolean);
    if (segments.length < 2) continue; // depth 1 routes (e.g. "/about") never form a group
    const prefix = "/" + segments.slice(0, -1).join("/");
    const list = groups.get(prefix) || [];
    list.push(route);
    groups.set(prefix, list);
  }

  const results: DetectedCollection[] = [];

  for (const [prefix, memberRoutes] of groups) {
    if (memberRoutes.length < MIN_CARDINALITY) continue;
    const listingRoute = routeSet.has(prefix) ? prefix : null;

    // Load each member's HTML from the converted bundle.
    const members: { route: string; $: Doc; body: Element | undefined }[] = [];
    let missing = false;
    for (const route of memberRoutes) {
      const file = fileByPath.get(routeToFilePath(route));
      if (!file?.content) {
        missing = true;
        break;
      }
      const $ = load(file.content);
      members.push({ route, $, body: $("body")[0] });
    }
    if (missing || members.some((m) => !m.body)) {
      diag(`possible collection at ${prefix} skipped (missing page HTML)`);
      continue;
    }

    const bodyNodes: MemberNode[] = members.map((m) => ({ route: m.route, $: m.$, el: m.body as Element }));
    const divergences: Divergence[] = [];
    const rootResult = walk(bodyNodes, [], divergences);
    if (rootResult === "self") divergences.push({ path: [], nodes: bodyNodes });

    // Confidence = fraction of the reference tree that ISN'T inside a changed
    // region. Weighted by nodes[0] (first member) as the representative size
    // of each divergence's subtree — sizes are close enough across members
    // for this purpose (they're all instances of the same template).
    const totalNodes = countNodes(bodyNodes[0].el);
    const divergentNodes = divergences.reduce((n, d) => n + countNodes(d.nodes[0].el), 0);
    const confidence = totalNodes > 0 ? Math.max(0, 1 - divergentNodes / totalNodes) : 0;

    const fields: FieldSlot[] = [];
    const bodyValues: Record<string, Record<string, string>> = {};
    members.forEach((m) => (bodyValues[m.route] = {}));

    divergences.forEach((div) => {
      const field = classifyDivergence(fields.length, div);
      if (!field) return;
      fields.push(field);
      div.nodes.forEach((n) => {
        bodyValues[n.route][field.key] = valueForField(field, n);
      });
    });

    const { fields: headFields, values: headValues } = headFieldsAndItems(members.map((m) => ({ route: m.route, $: m.$ })));
    fields.push(...headFields);
    members.forEach((m) => Object.assign(bodyValues[m.route], headValues[m.route]));

    const hasTextField = fields.some((f) => f.type === "text" && f.scope === "body");
    if (confidence < MIN_CONFIDENCE || !hasTextField) {
      diag(`possible collection at ${prefix} skipped (structural match ${Math.round(confidence * 100)}%)`);
      continue;
    }

    const name = prefix.split("/").filter(Boolean).pop() || "Collection";
    const items: DetectedCollectionItem[] = members.map((m) => ({
      route: m.route,
      slug: slugFromRoute(m.route, prefix),
      fields: bodyValues[m.route],
    }));

    results.push({
      routePrefix: prefix,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      templateSourcePath: routeToFilePath(memberRoutes[0]),
      fields,
      confidence,
      listingRoute,
      items,
    });
  }

  return results;
}
