// Post-hydration content overrides for the visual editor (and any file-level
// edit to a converted bundle).
//
// Hybrid/pure-Next.js bundles keep Framer's JS runtime for fidelity, but that
// runtime re-renders the page from Framer's own JS data on load — so a static
// HTML edit gets overwritten a moment after hydration. To make an edit stick,
// we inject a small runtime script that re-applies each change (text, link
// href, or image src) and keeps enforcing it via a MutationObserver.
// Overrides come from two sources: buildOverrides() (diff of two documents,
// used by any file transform) and editorOverrides() (edits captured live from
// the visual editor's iframe DOM).
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
  /** Tag name to scan (e.g. "h1", "span", "a", "img"). */
  t: string;
  /**
   * Match mode:
   *  - "text": key = normalized textContent   → set innerHTML = h
   *  - "html": key = normalized innerHTML      → set innerHTML = h
   *  - "attr": key = attribute `a`'s value     → set attribute a = h (links)
   *  - "img":  key = src (or srcset contains k)→ set src = h, drop srcset/sizes
   */
  m: "text" | "html" | "attr" | "img";
  /** Normalized old content key the element must still show. */
  k: string;
  /** New value: innerHTML (text/html) or attribute value (attr/img). */
  h: string;
  /** Attribute name for m:"attr" (e.g. "href"). */
  a?: string;
  /** Optional stable-looking class to narrow the scan (perf, html mode). */
  c?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Edits captured directly from the visual editor's iframe DOM. */
export type EditorEdit =
  | { kind: "text"; tag: string; oldText: string; newText: string; cls?: string }
  | { kind: "link"; oldHref: string; newHref: string }
  | { kind: "image"; oldSrc: string; newSrc: string };

/** Turns editor-captured edits into runtime Override objects. */
export function editorOverrides(edits: EditorEdit[]): Override[] {
  const out: Override[] = [];
  for (const e of edits) {
    if (e.kind === "text") {
      const k = norm(e.oldText);
      if (!k || norm(e.newText) === k) continue;
      out.push({ t: (e.tag || "").toLowerCase() || "*", m: "text", k, h: escapeHtml(e.newText), c: e.cls });
    } else if (e.kind === "link") {
      if (!e.oldHref || e.oldHref === e.newHref) continue;
      out.push({ t: "a", m: "attr", a: "href", k: e.oldHref, h: e.newHref });
    } else if (e.kind === "image") {
      if (!e.oldSrc || e.oldSrc === e.newSrc) continue;
      out.push({ t: "img", m: "img", k: e.oldSrc, h: e.newSrc });
    }
  }
  return out;
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
    // A hydration-stable class narrows the runtime scan from every element of
    // the tag to a querySelectorAll on tag.class — Framer's hashed classes
    // survive hydration; variant classes may not, so this is best-effort perf.
    const cls = (bEl.attribs?.class || "")
      .split(/\s+/)
      .find((x) => /^framer-[A-Za-z0-9]+$/.test(x));
    const oldText = norm($a(aEl).text());
    const newText = norm($b(bEl).text());
    if (oldText && oldText !== newText) {
      found.push({ t: bEl.tagName, m: "text", k: oldText, h: neutralizeFragment(newInner), c: cls });
    } else {
      // Text-identical change (attribute/asset swap) — match on old innerHTML.
      const oldInner = norm($a(aEl).html() || "");
      if (!oldInner) return;
      found.push({ t: bEl.tagName, m: "html", k: oldInner, h: neutralizeFragment(newInner), c: cls });
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

// Runs in the browser: scans elements of each override's tag; any element
// still showing the old content gets the new innerHTML. Replacing changes the
// content key, so enforcement is naturally idempotent.
//
// Cost/safety bounds (a page can mutate 60×/s from marquees/typewriters):
//  - scans are THROTTLED to one per 600ms, coalesced from any mutation burst
//  - a reentrancy flag keeps our own writes from re-triggering the observer
//  - each override stops after writing in 5 separate scan rounds — a looping
//    animation that keeps restoring the old content would otherwise be fought
//    forever; one round may legitimately write many breakpoint copies
//  - html-mode scans narrow by the recorded framer-class when available
const RUNTIME = `(function(){var O=window.__FNO_OV__||[];var rounds=[];var applying=false;
function nm(s){return s.replace(/\\s+/g," ").trim()}
function apply(){if(applying)return;applying=true;try{
for(var i=0;i<O.length;i++){var o=O[i];if((rounds[i]||0)>=5)continue;var wrote=false;try{
var els=o.c?document.querySelectorAll(o.t+"."+o.c):document.getElementsByTagName(o.t);
for(var j=0;j<els.length;j++){var el=els[j];
if(o.m==="attr"){if(el.getAttribute(o.a)===o.k){el.setAttribute(o.a,o.h);wrote=true;}}
else if(o.m==="img"){var s=el.getAttribute("src"),ss=el.getAttribute("srcset")||"";if(s===o.k||ss.indexOf(o.k)>=0){el.setAttribute("src",o.h);el.removeAttribute("srcset");el.removeAttribute("sizes");wrote=true;}}
else{var key=o.m==="text"?nm(el.textContent||""):nm(el.innerHTML||"");if(key===o.k){el.innerHTML=o.h;wrote=true;}}}}catch(e){}
if(wrote)rounds[i]=(rounds[i]||0)+1;}
}finally{applying=false}}
var last=0,timer=null;
function schedule(){if(timer)return;var wait=Math.max(0,600-(Date.now()-last));timer=setTimeout(function(){timer=null;last=Date.now();apply();},wait);}
apply();last=Date.now();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule);
var n=0,t=setInterval(function(){schedule();if(++n>10)clearInterval(t);},600);
new MutationObserver(function(){if(!applying)schedule();}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});})();`;

const SCRIPT_RE = new RegExp(
  `<script id="${SCRIPT_ID}"[^>]*>window\\.__FNO_OV__=(\\[.*?\\]);.*?</script>`,
  "s"
);

function isOverride(o: unknown): o is Override {
  const x = o as Override;
  return (
    !!x &&
    typeof x.t === "string" &&
    (x.m === "text" || x.m === "html" || x.m === "attr" || x.m === "img") &&
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
  // Re-neutralize carried-over innerHTML fragments (text/html) so entries saved
  // by an older neutralizer get cleaned up on the next edit; attr/img values
  // (hrefs/srcs) are not HTML and are stored verbatim.
  for (const o of [...existing, ...overrides]) {
    const key = `${o.t}|${o.m}|${o.a || ""}|${o.k}`;
    const value = o.m === "text" || o.m === "html" ? { ...o, h: neutralizeFragment(o.h) } : { ...o };
    merged.set(key, value);
  }
  if (merged.size === 0) return html;

  const script = `<script id="${SCRIPT_ID}">window.__FNO_OV__=${JSON.stringify(
    [...merged.values()]
  ).replace(/</g, "\\u003c")};${RUNTIME}</script>`;

  if (base.includes("</body>")) return base.replace("</body>", script + "</body>");
  return base + script;
}
