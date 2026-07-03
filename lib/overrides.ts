// Post-hydration content overrides for AI edits.
//
// Hybrid/pure-Next.js bundles keep Framer's JS runtime for fidelity, but that
// runtime re-renders the page from Framer's own JS data on load — so a static
// HTML edit gets overwritten a moment after hydration. To make AI edits stick,
// we diff the original vs edited document and inject a small runtime script
// that re-applies each change and keeps enforcing it via a MutationObserver.
//
// Targeting is CONTENT-based, not structural: Framer's hydration shifts
// nth-child positions (it inserts sibling nodes) and drops variant classes, so
// CSS paths break. Instead each override records the element's tag + its OLD
// content key; at runtime, any element of that tag whose current content still
// matches the old key gets the new innerHTML. Self-healing by construction —
// it only ever fires on elements showing the stale content.
import * as cheerio from "cheerio";
import type { Element } from "domhandler";

export interface Override {
  /** Tag name to scan (e.g. "h1", "span"). */
  t: string;
  /** Match mode: old text content, or old innerHTML (for non-text changes). */
  m: "text" | "html";
  /** Normalized old content key the element must still show. */
  k: string;
  /** The new innerHTML to enforce (animation start-states neutralized). */
  h: string;
}

const SCRIPT_ID = "fno-ai-overrides";
/** Skip overrides for fragments bigger than this — enforcing a huge innerHTML
 *  every render would hurt more than the edit is worth. */
const MAX_FRAGMENT = 60_000;

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function attrsEqual(a: Element, b: Element): boolean {
  const aa = a.attribs || {};
  const bb = b.attribs || {};
  const ak = Object.keys(aa);
  const bk = Object.keys(bb);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => aa[k] === bb[k]);
}

/** Strip animation start-state styles so the enforced markup renders settled.
 *  Framer appear effects animate transform (slide/scale), opacity (fade), and
 *  filter (blur-up) — all must go or injected text renders frozen mid-effect.
 *  Elements' own styles are left alone at runtime (Framer positions elements
 *  with transforms) — only the injected fragment's inline styles are cleaned. */
function neutralizeFragment(html: string): string {
  return html.replace(/style="([^"]*)"/g, (_m, style: string) => {
    const cleaned = style
      .split(";")
      .map((s: string) => s.trim())
      .filter(
        (s: string) =>
          s && !/^(transform|opacity|will-change|filter|-webkit-filter)\s*:/i.test(s)
      )
      .join("; ");
    return `style="${cleaned}"`;
  });
}

/**
 * Walks the original and edited body trees in parallel and records the
 * smallest changed elements. Structure outside the string-replaced regions is
 * identical, so an index-aligned walk is safe.
 */
export function buildOverrides(originalHtml: string, editedHtml: string): Override[] {
  const $a = cheerio.load(originalHtml);
  const $b = cheerio.load(editedHtml);
  const bodyA = $a("body")[0];
  const bodyB = $b("body")[0];
  if (!bodyA || !bodyB) return [];

  const found: Override[] = [];

  function record(aEl: Element, bEl: Element) {
    const newInner = $b(bEl).html() || "";
    if (newInner.length > MAX_FRAGMENT) return;
    const oldText = norm($a(aEl).text());
    const newText = norm($b(bEl).text());
    if (oldText && oldText !== newText) {
      found.push({ t: bEl.tagName, m: "text", k: oldText, h: neutralizeFragment(newInner) });
    } else {
      // Text-identical change (attribute/asset swap) — match on old innerHTML.
      const oldInner = norm($a(aEl).html() || "");
      if (!oldInner) return;
      found.push({ t: bEl.tagName, m: "html", k: oldInner, h: neutralizeFragment(newInner) });
    }
  }

  // Returns "same" | "handled" (recorded deeper) | "self" (caller records pair).
  function walk(a: Element, b: Element): "same" | "handled" | "self" {
    if ($a.html(a) === $b.html(b)) return "same";
    if (a.tagName !== b.tagName || !attrsEqual(a, b)) return "self";

    const ca = a.children || [];
    const cb = b.children || [];
    if (ca.length !== cb.length) return "self";

    const diffIdx: number[] = [];
    for (let i = 0; i < ca.length; i++) {
      if ($a.html(ca[i]) !== $b.html(cb[i])) diffIdx.push(i);
    }
    if (diffIdx.length === 0) return "same";

    // Any changed non-element child (text node) → enforce this element.
    if (diffIdx.some((i) => ca[i].type !== "tag" || cb[i].type !== "tag")) return "self";

    // Recurse into each changed child independently for surgical overrides.
    for (const i of diffIdx) {
      const r = walk(ca[i] as Element, cb[i] as Element);
      if (r === "self") record(ca[i] as Element, cb[i] as Element);
    }
    return "handled";
  }

  const rootResult = walk(bodyA, bodyB);
  if (rootResult === "self") record(bodyA, bodyB);
  return found;
}

// Runs in the browser: repeatedly (interval during load + MutationObserver
// after) scans elements of each override's tag; any element still showing the
// old content gets the new innerHTML. Replacing changes the content key, so
// enforcement is naturally idempotent — no loops.
const RUNTIME = `(function(){var O=window.__FNO_OV__||[];function nm(s){return s.replace(/\\s+/g," ").trim()}
function apply(){for(var i=0;i<O.length;i++){var o=O[i];try{var els=document.getElementsByTagName(o.t);for(var j=0;j<els.length;j++){var el=els[j];var key=o.m==="text"?nm(el.textContent||""):nm(el.innerHTML||"");if(key===o.k){el.innerHTML=o.h;}}}catch(e){}}}
apply();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply);
var n=0,t=setInterval(function(){apply();if(++n>24)clearInterval(t);},250);
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true,characterData:true});})();`;

const SCRIPT_RE = new RegExp(
  `<script id="${SCRIPT_ID}"[^>]*>window\\.__FNO_OV__=(\\[.*?\\]);.*?</script>`,
  "s"
);

function isOverride(o: unknown): o is Override {
  const x = o as Override;
  return (
    !!x &&
    typeof x.t === "string" &&
    (x.m === "text" || x.m === "html") &&
    typeof x.k === "string" &&
    typeof x.h === "string"
  );
}

/**
 * Injects (or merges into) the override-enforcer script. Overrides from
 * earlier edit sessions are kept — chained edits work because each override
 * only fires on its own stale content — but a re-edit of the same element
 * from the same base content replaces the older entry.
 */
export function injectOverrides(html: string, overrides: Override[]): string {
  let existing: Override[] = [];
  let base = html;
  const m = html.match(SCRIPT_RE);
  if (m) {
    try {
      existing = (JSON.parse(m[1]) as unknown[]).filter(isOverride);
    } catch {
      existing = [];
    }
    base = html.replace(SCRIPT_RE, "");
  }

  const merged = new Map<string, Override>();
  // Re-neutralize carried-over entries too, so fragments saved by an older
  // (less thorough) neutralizer get cleaned up on the next edit.
  for (const o of [...existing, ...overrides]) {
    merged.set(`${o.t}|${o.m}|${o.k}`, { ...o, h: neutralizeFragment(o.h) });
  }
  if (merged.size === 0) return html;

  const script = `<script id="${SCRIPT_ID}">window.__FNO_OV__=${JSON.stringify(
    [...merged.values()]
  ).replace(/</g, "\\u003c")};${RUNTIME}</script>`;

  if (base.includes("</body>")) return base.replace("</body>", script + "</body>");
  return base + script;
}
