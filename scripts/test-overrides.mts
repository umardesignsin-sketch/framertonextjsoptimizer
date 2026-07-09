// Unit test for lib/overrides.ts — content-keyed diff detection, style
// neutralization, script injection, merge-on-re-edit, and the visual editor's
// text/link/image override builder.
// Run: npx tsx scripts/test-overrides.mts
import { buildOverrides, injectOverrides, editorOverrides } from "../lib/overrides";

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

// --- editorOverrides: text / link / image edits captured from the iframe ---
const eo = editorOverrides([
  { kind: "text", tag: "H1", oldText: "  Old  Hero  ", newText: "New <b>Hero</b>" },
  { kind: "link", oldHref: "/about", newHref: "/team" },
  { kind: "image", oldSrc: "assets/img/a.webp", newSrc: "https://cdn/x.png" },
  { kind: "text", tag: "P", oldText: "same", newText: "same" }, // no-op dropped
]);
// Editor text edits use "txt" mode: text-node rewrite that preserves nested
// spans (fonts, hover/appear effect markup) instead of flattening innerHTML.
const eoText = eo.find((o) => o.m === "txt");
const eoLink = eo.find((o) => o.m === "attr");
const eoImg = eo.find((o) => o.m === "img");
// Inject editor overrides into a page and confirm they serialize + enforce.
const editorPage = injectOverrides(
  `<html><body><h1>Old Hero</h1><a href="/about">x</a><img src="assets/img/a.webp"></body></html>`,
  eo
);
const eoPayload = editorPage.match(new RegExp("__FNO_OV__=(\\[.*?\\]);", "s"))?.[1] || "[]";
const eoParsed = JSON.parse(eoPayload) as { t: string; m: string; k: string; h: string; a?: string }[];

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
  // editorOverrides
  ["editor: 3 edits (no-op dropped)", eo.length === 3],
  ["editor text: tag lowercased, key normalized", !!eoText && eoText.t === "h1" && eoText.k === "Old Hero"],
  ["editor text: new value HTML-escaped", !!eoText && eoText.h === "New &lt;b&gt;Hero&lt;/b&gt;"],
  ["editor link: attr/href override", !!eoLink && eoLink.a === "href" && eoLink.k === "/about" && eoLink.h === "/team"],
  ["editor image: img mode with old src key", !!eoImg && eoImg.k === "assets/img/a.webp" && eoImg.h === "https://cdn/x.png"],
  ["editor overrides serialize into the page", eoParsed.length === 3 && eoParsed.some((o) => o.m === "attr") && eoParsed.some((o) => o.m === "img")],
];

let ok = true;
for (const [name, pass] of checks) {
  console.log((pass ? "PASS" : "FAIL") + " — " + name);
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
