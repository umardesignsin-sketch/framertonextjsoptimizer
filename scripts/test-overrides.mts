// Unit test for lib/overrides.ts — content-keyed diff detection, style
// neutralization, script injection, and merge-on-re-edit.
// Run: npx tsx scripts/test-overrides.mts
import { buildOverrides, injectOverrides } from "../lib/overrides";

const original = `<!DOCTYPE html><html><head><title>T</title></head><body>
<div id="main"><div class="framer-abc" data-framer-name="Hero">
<h1 class="framer-h1"><span style="transform: translateY(150px); opacity: 0.001; will-change: transform; filter: blur(10px)">Attention</span> <span style="transform: translateY(150px); -webkit-filter: blur(10px)">Taken</span></h1>
<p class="framer-sub">Subtitle stays.</p>
</div><footer class="framer-foot"><span>hello@old.com</span></footer></div>
</body></html>`;

// Simulates a find/replace edit that restructures the heading spans (2 -> 1),
// plus a footer text change.
const edited = original
  .replace(
    `<span style="transform: translateY(150px); opacity: 0.001; will-change: transform; filter: blur(10px)">Attention</span> <span style="transform: translateY(150px); -webkit-filter: blur(10px)">Taken</span>`,
    `<span style="transform: translateY(150px); filter: blur(10px)">Under Command</span>`
  )
  .replace("hello@old.com", "hi@new.io");

const overrides = buildOverrides(original, edited);
console.log("overrides:", JSON.stringify(overrides.map((o) => ({ ...o, h: o.h.slice(0, 60) })), null, 1));

const out = injectOverrides(edited, overrides);

// Re-edit pass on the already-injected doc: change the email again.
const edited2 = out.replace("hi@new.io", "hi@final.io");
const overrides2 = buildOverrides(out, edited2);
const out2 = injectOverrides(edited2, overrides2);

const scriptCount = (out2.match(/id="fno-ai-overrides"/g) || []).length;
const payload = out2.match(new RegExp("__FNO_OV__=(\\[.*?\\]);", "s"))?.[1] || "[]";
const parsed = JSON.parse(payload) as { t: string; m: string; k: string; h: string }[];

const h1Override = overrides.find((o) => o.t === "h1");
const footerOverride = overrides.find((o) => o.k.includes("hello@old.com"));

const checks: ReadonlyArray<readonly [string, boolean]> = [
  ["h1 recorded (span restructure bubbles to h1)", !!h1Override],
  ["h1 keyed on old text", !!h1Override && h1Override.m === "text" && h1Override.k.includes("Attention")],
  ["footer span recorded with old email key", !!footerOverride && footerOverride.m === "text"],
  ["transform stripped from fragments", overrides.every((o) => !/transform\s*:/.test(o.h))],
  ["opacity stripped from fragments", overrides.every((o) => !/opacity\s*:/.test(o.h))],
  ["filter/blur stripped from fragments", overrides.every((o) => !/filter\s*:/.test(o.h))],
  ["merged payload has no blur anywhere", parsed.every((o) => !/filter\s*:/.test(o.h))],
  ["script injected before </body>", out.includes("</script></body>")],
  ["re-edit keeps a single merged script", scriptCount === 1],
  ["merged payload keeps h1 override", parsed.some((o) => o.h.includes("Under Command"))],
  ["merged payload chains email edits (old key -> newest value)", parsed.some((o) => o.k.includes("hi@new.io") && o.h.includes("hi@final.io"))],
  ["no raw </script> break in payload", !payload.includes("</script")],
];

let ok = true;
for (const [name, pass] of checks) {
  console.log((pass ? "PASS" : "FAIL") + " — " + name);
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
