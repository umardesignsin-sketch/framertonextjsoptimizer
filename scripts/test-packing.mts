// Unit test for lib/ai-edit.ts pruning + request packing.
// Run: npx tsx scripts/test-packing.mts
import { pruneForModel, packRequests, salvageEdits } from "../lib/ai-edit";

// --- pruneForModel ---
const html = `<html><head><style>.a{color:red}</style><script>var x=1;</script></head>
<body><h1>Keep me</h1><svg viewBox="0 0 10 10"><path d="M0 0 L10 10"/></svg>
<noscript>fallback</noscript><p>Also keep</p><script type="framer/appear">{"x":1}</script></body></html>`;

const pruned = pruneForModel(html);

// Byte-fidelity: every retained line must appear verbatim in the original.
const keptVerbatim = ["<h1>Keep me</h1>", "<p>Also keep</p>", '<svg viewBox="0 0 10 10">'].every(
  (s) => pruned.includes(s) && html.includes(s)
);

// --- packRequests --- (cap = 550_000 chars/request, 6 requests)
const small = { path: "index.html", prompt: "x".repeat(100_000) };
const big = { path: "big.html", prompt: "y".repeat(1_300_000) }; // 3 parts
const mid = { path: "mid.html", prompt: "z".repeat(400_000) };
const { requests, skipped } = packRequests([small, big, mid]);

const flat = requests.map((r) => r.join("\n\n"));
const totalOk = flat.every((r) => r.length <= 560_000);
const bigParts = flat.join("\n").match(/big\.html \(part \d of 3\)/g) || [];

// Overflow case: 10 huge docs must cap at 6 requests and report skips.
const many = Array.from({ length: 10 }, (_, i) => ({
  path: `p${i}.html`,
  prompt: "q".repeat(540_000),
}));
const capped = packRequests(many);

const checks: ReadonlyArray<readonly [string, boolean]> = [
  ["scripts removed", !pruned.includes("var x=1")],
  ["styles removed", !pruned.includes("color:red")],
  ["noscript removed", !pruned.includes("fallback")],
  ["svg emptied but tag kept", pruned.includes("<svg") && !pruned.includes("M0 0 L10 10")],
  ["framer/appear script removed too", !pruned.includes('{"x":1}')],
  ["kept content byte-identical", keptVerbatim],
  ["requests within size cap", totalOk],
  ["big doc split into 3 labeled parts", bigParts.length === 3],
  ["all docs included when they fit", skipped.length === 0],
  ["homepage first in first request", flat[0].includes("index.html")],
  ["overflow capped at 6 requests", capped.requests.length === 6],
  ["overflow reports skipped docs", capped.skipped.length === 4],
];

// --- salvageEdits ---
const truncated = `{"edits":[{"file":"index.html","find":"<span>Fade</span>","replace":"<span>Insane</span>"},{"file":"index.html","find":"Fade \\"quoted\\"","replace":"Insane"},{"file":"projects/index.html","find":"<span>Fa`;
const rescued = salvageEdits(truncated);
const salvageChecks: ReadonlyArray<readonly [string, boolean]> = [
  ["salvages complete edits from truncated JSON", rescued.length === 2],
  ["salvaged edit content intact", rescued[0]?.replace === "<span>Insane</span>"],
  ["handles escaped quotes inside strings", rescued[1]?.find === 'Fade "quoted"'],
  ["ignores the incomplete trailing edit", !rescued.some((e) => e.find.includes("<span>Fa") && !e.find.includes("Fade"))],
];

let ok = true;
for (const [name, pass] of [...checks, ...salvageChecks]) {
  console.log((pass ? "PASS" : "FAIL") + " — " + name);
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
