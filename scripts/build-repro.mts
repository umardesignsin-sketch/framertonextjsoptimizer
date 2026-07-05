// Reproduces the "site frozen after 2nd AI edit" report without the model:
// fetches the live Framer page, applies two sequential text edits through the
// real override pipeline (buildOverrides + injectOverrides, with the merge
// path a 2nd edit takes), and writes control/edited pages to public/ for
// browser profiling. Run: npx tsx scripts/build-repro.mts
import { writeFileSync } from "node:fs";
import { buildOverrides, injectOverrides } from "../lib/overrides";

const URL = "https://portfolix-template.framer.website/";

const res = await fetch(URL, { headers: { "user-agent": "Mozilla/5.0" } });
const original = await res.text();
console.log("fetched:", original.length, "chars");

// --- Edit 1: hero heading text (same shape as an AI find/replace) ---
const heroFinds = [...original.matchAll(/>Hey, I'm</g)];
console.log("hero anchor occurrences:", heroFinds.length);
let v2 = original.split(">Hey, I'm<").join(">Howdy, I am<");
if (v2 === original) throw new Error("edit 1 found nothing to change");
const ov1 = buildOverrides(original, v2);
console.log("edit1 overrides:", ov1.length, ov1.map((o) => `${o.t}/${o.m}/k=${o.k.slice(0, 30)}`));
v2 = injectOverrides(v2, ov1);

// --- Edit 2: project card titles (second sequential edit → merge path) ---
let v3 = v2.split(">Fade<").join(">Renewed<");
if (v3 === v2) throw new Error("edit 2 found nothing to change");
const ov2 = buildOverrides(v2, v3);
console.log("edit2 overrides:", ov2.length, ov2.map((o) => `${o.t}/${o.m}/k=${o.k.slice(0, 30)}`));
v3 = injectOverrides(v3, ov2);

const payload = v3.match(new RegExp("__FNO_OV__=(\\[.*?\\]);", "s"))?.[1] ?? "[]";
console.log("merged payload entries:", (JSON.parse(payload) as unknown[]).length);
console.log("payload bytes:", payload.length);

writeFileSync("public/repro-clean.html", original);
writeFileSync("public/repro-2edits.html", v3);
console.log("wrote public/repro-clean.html + public/repro-2edits.html");
