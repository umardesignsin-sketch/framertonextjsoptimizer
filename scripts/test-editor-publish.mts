// Unit test for lib/editor-publish.ts applyEditsToReport — proves editor edits
// become override scripts injected into EVERY page (hybrid .html + pure
// Next.js route.ts), that non-op edits are dropped, and binary assets are
// untouched. No DB/server needed. Run: npx tsx scripts/test-editor-publish.mts
import { applyEditsToReport } from "../lib/editor-publish";
import type { ConvertReport, ConvertedFile } from "../lib/types";
import type { EditorEdit } from "../lib/overrides";

const aboutHtml = `<!DOCTYPE html><html><body><h1>Old Hero</h1><a href="/about">About</a></body></html>`;
const routeTs = `export const dynamic = "force-static";

const HTML = ${JSON.stringify(aboutHtml)};

export function GET() { return new Response(HTML, { headers: { "content-type": "text/html" } }); }
`;

const files: ConvertedFile[] = [
  { path: "index.html", content: `<html><body><h1>Old Hero</h1><a href="/about">About</a><img src="assets/img/a.webp"></body></html>` },
  { path: "app/about/route.ts", content: routeTs },
  { path: "assets/img/a.webp", binary: Buffer.from([0x52, 0x49, 0x46, 0x46]) }, // "RIFF"
];
const report: ConvertReport = {
  sourceUrl: "https://x.framer.website/",
  pages: [],
  stats: [],
  notes: [],
  files,
};

const edits: EditorEdit[] = [
  { kind: "text", tag: "H1", oldText: "Old Hero", newText: "Umar Mirza" },
  { kind: "link", oldHref: "/about", newHref: "/team" },
  { kind: "image", oldSrc: "assets/img/a.webp", newSrc: "https://cdn/new.png" },
];

const out = applyEditsToReport(report, edits);

const idx = out.files.find((f) => f.path === "index.html")!.content!;
const route = out.files.find((f) => f.path === "app/about/route.ts")!.content!;
const asset = out.files.find((f) => f.path === "assets/img/a.webp")!;

function payload(html: string) {
  const m = html.match(new RegExp("__FNO_OV__=(\\[.*?\\]);", "s"));
  return m ? (JSON.parse(m[1]) as { m: string; k: string; h: string; a?: string }[]) : [];
}
const idxOv = payload(idx);
// route.ts embeds the edited HTML as a JSON string — unwrap it and check.
const embedded = route.match(/const HTML = ("(?:[^"\\]|\\.)*");/);
const embeddedHtml = embedded ? (JSON.parse(embedded[1]) as string) : "";
const routeOv = payload(embeddedHtml);

// no-op: empty edits returns the report unchanged.
const noop = applyEditsToReport(report, []);

const checks: ReadonlyArray<readonly [string, boolean]> = [
  ["index.html has an override script", idx.includes("fno-ai-overrides") && idxOv.length === 3],
  ["index override: text/link/image all present", idxOv.some((o) => o.m === "text") && idxOv.some((o) => o.m === "attr") && idxOv.some((o) => o.m === "img")],
  ["index link override keyed on old href", idxOv.some((o) => o.m === "attr" && o.k === "/about" && o.h === "/team" && o.a === "href")],
  ["index image override keyed on old src", idxOv.some((o) => o.m === "img" && o.k === "assets/img/a.webp" && o.h === "https://cdn/new.png")],
  ["route.ts still wraps HTML as a JSON string literal", !!embedded && embeddedHtml.length > 0],
  ["route.ts embedded HTML got the overrides too", routeOv.length === 3 && embeddedHtml.includes("fno-ai-overrides")],
  ["route.ts remains valid JS (GET export intact)", route.includes("export function GET()")],
  ["binary asset untouched", !!asset.binary && asset.binary.length === 4 && !asset.content],
  ["empty edits leaves the report unchanged", noop === report],
];

let ok = true;
for (const [name, pass] of checks) {
  console.log((pass ? "PASS" : "FAIL") + " — " + name);
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
