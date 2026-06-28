// Restore Framer's appear / scroll-reveal animations as a tiny CSS +
// IntersectionObserver layer.
//
// Framer publishes the full animation spec inline as
//   <script type="framer/appear"> { "<appearId>": { "default"|<bpHash>: { initial, animate } } } </script>
//   <script type="framer/appear"> [ { "hash": "<bpHash>", "mediaQuery": "…" } ] </script>
// where `initial`/`animate` hold {opacity,x,y,scale,rotate,rotateX,rotateY,skewX,skewY}
// and `animate.transition` holds {type,duration,delay,bounce,ease}.
//
// The optimizer strips Framer's JS runtime (the big perf win), which would
// normally leave these elements frozen at their resting state with no motion.
// We re-create the motion ourselves: emit CSS that parks each element at its
// `initial` state until it scrolls into view, then transitions it to the
// resting state (the inline style Framer already SSR'd). Progressive
// enhancement: the start state is gated behind a `.framer-anim` <html> class
// that only a tiny inline script adds, so with JS disabled everything renders
// visible (no blank page), and prefers-reduced-motion skips straight to shown.
import type { Doc } from "./parse";

interface AppearState {
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
  skewX?: number;
  skewY?: number;
}
interface AppearTransition {
  type?: string;
  duration?: number;
  delay?: number;
  bounce?: number;
  ease?: number[];
}
interface AppearDef {
  initial?: AppearState;
  animate?: AppearState & { transition?: AppearTransition };
}
type AppearEntry = Record<string, AppearDef | null>; // "default" | <bpHash>
type AppearMap = Record<string, AppearEntry>;
type BreakpointMap = Record<string, string>; // hash -> media query

export interface AppearResult {
  animated: number; // appear-ids given a CSS animation
  scriptsParsed: number;
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Build a CSS transform string from a Framer motion state. */
function transformOf(s: AppearState): string {
  const p: string[] = [];
  const x = s.x ?? 0;
  const y = s.y ?? 0;
  if (x || y) p.push(`translate3d(${round(x)}px,${round(y)}px,0)`);
  if (s.scale != null && s.scale !== 1) p.push(`scale(${round(s.scale)})`);
  if (s.rotate) p.push(`rotate(${round(s.rotate)}deg)`);
  if (s.rotateX) p.push(`rotateX(${round(s.rotateX)}deg)`);
  if (s.rotateY) p.push(`rotateY(${round(s.rotateY)}deg)`);
  if (s.skewX) p.push(`skewX(${round(s.skewX)}deg)`);
  if (s.skewY) p.push(`skewY(${round(s.skewY)}deg)`);
  return p.length ? p.join(" ") : "none";
}

/** Approximate a Framer transition with a CSS timing function. */
function easingOf(t?: AppearTransition): string {
  if (t?.ease && Array.isArray(t.ease) && t.ease.length === 4) {
    return `cubic-bezier(${t.ease.map(round).join(",")})`;
  }
  if (t?.type === "spring") {
    // Springs can't be expressed in CSS; approximate. A meaningful bounce gets
    // a slight overshoot, otherwise a smooth ease-out.
    return (t.bounce ?? 0) >= 0.15
      ? "cubic-bezier(0.34,1.56,0.64,1)"
      : "cubic-bezier(0.22,1,0.36,1)";
  }
  return "cubic-bezier(0.22,1,0.36,1)";
}

/** Perceptual duration in seconds, clamped to a sane range. */
function durationOf(t?: AppearTransition): number {
  let d = t?.duration ?? 0.5;
  if (t?.type === "spring") d *= 1.3; // spring "duration" reads faster than a tween
  return Math.min(Math.max(d, 0.3), 1.4);
}

function firstNonNull(entry: AppearEntry): AppearDef | null {
  for (const v of Object.values(entry)) if (v) return v;
  return null;
}

/** The final (visible, resting) state an appear element animates into. */
function finalOf(def: AppearDef): { opacity: number; transform: string } {
  const a = def.animate ?? {};
  return { opacity: a.opacity ?? 1, transform: transformOf(a) };
}

const HTML_FLAG_JS = `document.documentElement.classList.add('framer-anim');`;

const OBSERVER_JS = `
(function(){
  var els=[].slice.call(document.querySelectorAll('[data-framer-appear-id]'));
  if(!els.length) return;
  function show(e){ e.classList.add('framer-appeared'); }
  function showAll(){ for(var i=0;i<els.length;i++) show(els[i]); }
  if(!('IntersectionObserver' in window) ||
     (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)){
    showAll(); return;
  }
  var io=new IntersectionObserver(function(entries){
    for(var i=0;i<entries.length;i++){
      if(entries[i].isIntersecting){ show(entries[i].target); io.unobserve(entries[i].target); }
    }
  },{threshold:0, rootMargin:'0px 0px -8% 0px'});
  for(var i=0;i<els.length;i++) io.observe(els[i]);
  // Safety sweep: reveal anything at/above the fold the observer hasn't caught
  // (e.g. zero-size wrapper containers IntersectionObserver can't track). Runs
  // after load AND on every scroll/resize (throttled), so anything the user
  // scrolls to is guaranteed to reveal — no content can stay stuck hidden —
  // while genuine below-the-fold content still waits for scroll-reveal.
  var ticking=false;
  function sweep(){
    ticking=false;
    var vh=window.innerHeight||0, remaining=false;
    for(var i=0;i<els.length;i++){
      var e=els[i];
      if(e.classList.contains('framer-appeared')) continue;
      if(e.getBoundingClientRect().top < vh){ show(e); io.unobserve(e); }
      else remaining=true;
    }
    if(!remaining){ window.removeEventListener('scroll',onScroll); window.removeEventListener('resize',onScroll); }
  }
  function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(sweep); } }
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll);
  if(document.readyState==='complete') setTimeout(sweep,300);
  else window.addEventListener('load', function(){ setTimeout(sweep,300); });
})();
`;

/**
 * Parse the framer/appear scripts present in `$` and inject a CSS +
 * IntersectionObserver layer that reproduces the animations. Call this BEFORE
 * stripping the runtime (it reads the framer/appear scripts, which strip
 * removes afterwards). Returns counts for reporting.
 */
export function restoreAppearAnimations($: Doc): AppearResult {
  const animMap: AppearMap = {};
  const bpMap: BreakpointMap = {};
  let scriptsParsed = 0;

  $('script[type="framer/appear"]').each((_, el) => {
    const txt = $(el).html();
    if (!txt) return;
    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) {
        // Breakpoint table: [{ hash, mediaQuery }]
        for (const b of parsed) {
          if (b && typeof b.hash === "string" && typeof b.mediaQuery === "string") {
            bpMap[b.hash] = b.mediaQuery;
          }
        }
      } else if (parsed && typeof parsed === "object") {
        Object.assign(animMap, parsed as AppearMap);
      }
      scriptsParsed++;
    } catch {
      /* malformed appear script — skip */
    }
  });

  if (scriptsParsed === 0 || Object.keys(animMap).length === 0) {
    return { animated: 0, scriptsParsed };
  }

  const rules: string[] = [];
  let animated = 0;

  // Framer SSRs animated elements at their START state (inline opacity:0.001),
  // so we cannot rely on the inline style for the resting state. Instead we
  // drive all three states explicitly from the JSON:
  //   start  = `initial`  (per breakpoint)
  //   final  = `animate`  (the visible resting state)
  // and gate on a `.framer-anim` <html> class so that with JS disabled the
  // element falls back to its FINAL (visible) state — never stuck hidden.
  for (const [id, entry] of Object.entries(animMap)) {
    if (!entry || typeof entry !== "object") continue;
    const primary = entry.default ?? firstNonNull(entry);
    if (!primary || !primary.initial) continue;

    const attr = `[data-framer-appear-id="${escapeAttr(id)}"]`;
    const tr = primary.animate?.transition;
    const dur = durationOf(tr);
    const ease = easingOf(tr);
    const delay = Math.max(tr?.delay ?? 0, 0);
    const final = finalOf(primary);

    // Shared transition (applies whenever the runtime flag is on).
    rules.push(
      `.framer-anim ${attr}{transition:opacity ${dur}s ${ease} ${delay}s,transform ${dur}s ${ease} ${delay}s;will-change:opacity,transform}`
    );
    // JS off / flag never set → show the FINAL (visible) state. No-JS safety net.
    rules.push(
      `html:not(.framer-anim) ${attr}{opacity:${final.opacity}!important;transform:${final.transform}!important}`
    );
    // JS on + revealed → FINAL state (the element transitions into this).
    rules.push(
      `.framer-anim ${attr}.framer-appeared{opacity:${final.opacity}!important;transform:${final.transform}!important}`
    );

    // JS on + not yet revealed → START state. Default breakpoint first…
    const baseInit = entry.default?.initial ?? primary.initial;
    rules.push(
      `.framer-anim ${attr}:not(.framer-appeared){opacity:${baseInit.opacity ?? 0.001}!important;transform:${transformOf(baseInit)}!important}`
    );
    // …then per-breakpoint start-state overrides.
    for (const [key, def] of Object.entries(entry)) {
      if (key === "default" || !def || !def.initial) continue;
      const mq = bpMap[key];
      if (!mq) continue;
      rules.push(
        `@media ${mq}{.framer-anim ${attr}:not(.framer-appeared){opacity:${def.initial.opacity ?? 0.001}!important;transform:${transformOf(def.initial)}!important}}`
      );
    }

    animated++;
  }

  if (animated === 0) return { animated: 0, scriptsParsed };

  // Inject: <html>-flag script first (head, runs before paint), the CSS, then
  // the observer at end of body. All tagged so the JS stripper preserves them.
  $("head").prepend(
    `<script data-framer-optimizer="anim-flag">${HTML_FLAG_JS}</script>`
  );
  $("head").append(
    `<style data-framer-optimizer="appear-anim">${rules.join("")}</style>`
  );
  $("body").append(
    `<script data-framer-optimizer="appear-observer">${OBSERVER_JS}</script>`
  );

  return { animated, scriptsParsed };
}

/** Minimal CSS attribute-value escaper for appear-id values. */
function escapeAttr(v: string): string {
  return v.replace(/["\\]/g, "\\$&");
}
