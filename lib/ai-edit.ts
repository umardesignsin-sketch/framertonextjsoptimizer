// Core of the AI live-site editor: given a converted bundle and a user
// instruction, ask Gemini for precise find/replace edits and apply them.
//
// Works on both output kinds:
//  - hybrid bundles: plain .html files are edited directly
//  - pure Next.js bundles: each app/**/route.ts embeds the page HTML as a
//    JSON string (const HTML = "...") — we unwrap it, edit the HTML, re-wrap.
//
// Edits are literal, unique substring replacements (never whole-file
// regeneration) so huge Framer documents can't be mangled wholesale.
//
// Large-page strategy: what we SEND the model is pruned (script/style bodies
// and svg internals dropped — byte-identical elsewhere, so returned "find"
// strings still match the real file), the homepage goes first, and oversized
// documents are split across multiple sequential model calls.
import type { ConvertedFile } from "./types";
import { geminiJson } from "./gemini";
import { buildOverrides, injectOverrides } from "./overrides";

/** Max characters of pruned content per model request (~140K tokens, safely
 *  inside free-tier per-minute token limits). */
const MAX_REQUEST_CHARS = 550_000;
/** Hard cap on model calls per edit run. */
const MAX_REQUESTS = 6;
/** Wait once this long on a rate-limit response before retrying. */
const RATE_LIMIT_BACKOFF_MS = 45_000;

const NEXTJS_HTML_RE = /const HTML = ("(?:[^"\\]|\\.)*");/;

interface EditableDoc {
  /** Bundle file path the doc came from. */
  path: string;
  /** The full original HTML (edits are applied against this). */
  html: string;
  /** Pruned HTML shown to the model. */
  prompt: string;
  /** How to write an updated HTML back into the bundle file. */
  wrap: (updatedHtml: string, originalFileContent: string) => string;
}

export interface AiEdit {
  file: string;
  find: string;
  replace: string;
}

export interface AiEditResult {
  files: ConvertedFile[];
  applied: AiEdit[];
  skippedFiles: string[];
  failedEdits: { file: string; reason: string }[];
  summary: string;
}

/** Drops content the model doesn't need. Everything KEPT stays byte-identical
 *  to the original, so "find" strings copied from the pruned view still match
 *  the real file. */
export function pruneForModel(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/(<svg\b[^>]*>)[\s\S]*?(<\/svg>)/gi, "$1$2");
}

/** Root page first, then shallow routes, so the homepage always gets seen. */
function docOrder(a: EditableDoc, b: EditableDoc): number {
  const rootA = a.path === "index.html" || a.path === "app/route.ts" ? 0 : 1;
  const rootB = b.path === "index.html" || b.path === "app/route.ts" ? 0 : 1;
  if (rootA !== rootB) return rootA - rootB;
  const depthA = a.path.split("/").length;
  const depthB = b.path.split("/").length;
  if (depthA !== depthB) return depthA - depthB;
  return a.path.localeCompare(b.path);
}

function extractDocs(files: ConvertedFile[]): EditableDoc[] {
  const docs: EditableDoc[] = [];

  for (const f of files) {
    if (!f.content) continue;

    let html: string | null = null;
    let wrap: EditableDoc["wrap"] | null = null;

    if (f.path.endsWith(".html")) {
      html = f.content;
      wrap = (updated) => updated;
    } else if (f.path.endsWith("route.ts")) {
      const m = f.content.match(NEXTJS_HTML_RE);
      if (m) {
        try {
          html = JSON.parse(m[1]) as string;
          wrap = (updated, original) =>
            original.replace(NEXTJS_HTML_RE, `const HTML = ${JSON.stringify(updated)};`);
        } catch {
          html = null;
        }
      }
    }

    if (html === null || !wrap) continue;
    docs.push({ path: f.path, html, prompt: pruneForModel(html), wrap });
  }

  return docs.sort(docOrder);
}

/** Packs docs (splitting oversized ones) into ≤ MAX_REQUESTS model calls. */
export function packRequests(docs: { path: string; prompt: string }[]): {
  requests: string[][];
  skipped: string[];
} {
  // Flatten docs into labeled parts, splitting any doc bigger than one request.
  const parts: { path: string; text: string }[] = [];
  for (const doc of docs) {
    if (doc.prompt.length <= MAX_REQUEST_CHARS) {
      parts.push({ path: doc.path, text: `=== FILE: ${doc.path} ===\n${doc.prompt}` });
    } else {
      const n = Math.ceil(doc.prompt.length / MAX_REQUEST_CHARS);
      for (let i = 0; i < n; i++) {
        const piece = doc.prompt.slice(i * MAX_REQUEST_CHARS, (i + 1) * MAX_REQUEST_CHARS);
        parts.push({
          path: doc.path,
          text: `=== FILE: ${doc.path} (part ${i + 1} of ${n}) ===\n${piece}`,
        });
      }
    }
  }

  const requests: string[][] = [];
  const skipped = new Set<string>();
  let cur: string[] = [];
  let chars = 0;

  for (const p of parts) {
    if (chars + p.text.length > MAX_REQUEST_CHARS && cur.length) {
      requests.push(cur);
      cur = [];
      chars = 0;
    }
    if (requests.length >= MAX_REQUESTS) {
      skipped.add(p.path);
      continue;
    }
    cur.push(p.text);
    chars += p.text.length;
  }
  if (cur.length && requests.length < MAX_REQUESTS) requests.push(cur);

  return { requests, skipped: [...skipped] };
}

function buildPrompt(instruction: string, fileBlocks: string): string {
  return `You are an expert web developer editing a static website snapshot exported from Framer.

USER INSTRUCTION:
${instruction}

Below are the site's HTML documents (scripts, styles, and svg internals are omitted; some large documents arrive in parts). Apply the instruction by producing precise text edits.

RULES:
- Reply ONLY with JSON matching: {"edits":[{"file":"<path>","find":"<exact substring>","replace":"<replacement>"}],"summary":"<one or two sentences describing what you changed>"}
- "file" is the path WITHOUT any "(part i of n)" suffix.
- "find" MUST be copied verbatim from the shown content (exact characters, including whitespace) and SHOULD be unique within that file. Include enough surrounding context to make it unique.
- Framer duplicates markup for responsive breakpoints — the same text often appears several times. Every occurrence of "find" gets replaced, so prefer a "find" that covers exactly the repeated fragment you want changed everywhere.
- Keep edits minimal and surgical. Do NOT reformat or rewrite unrelated markup.
- Preserve all Framer attributes, classes, and structure unless the instruction requires changing them.
- If nothing in the shown content matches the instruction, return {"edits":[],"summary":"<explain why>"}.

${fileBlocks}`;
}

function isRateLimit(e: unknown): boolean {
  return e instanceof Error && /\(429\)|RESOURCE_EXHAUSTED|rate/i.test(e.message);
}

async function callModel(prompt: string): Promise<string> {
  try {
    return await geminiJson(prompt);
  } catch (e) {
    if (!isRateLimit(e)) throw e;
    await new Promise((r) => setTimeout(r, RATE_LIMIT_BACKOFF_MS));
    return geminiJson(prompt);
  }
}

function applyEdits(
  files: ConvertedFile[],
  docs: EditableDoc[],
  edits: AiEdit[]
): { files: ConvertedFile[]; applied: AiEdit[]; failed: { file: string; reason: string }[] } {
  const docByPath = new Map(docs.map((d) => [d.path, d]));
  const htmlByPath = new Map(docs.map((d) => [d.path, d.html]));
  const applied: AiEdit[] = [];
  const failed: { file: string; reason: string }[] = [];

  for (const e of edits) {
    const doc = docByPath.get(e.file);
    if (!doc || typeof e.find !== "string" || typeof e.replace !== "string" || !e.find) {
      failed.push({ file: e.file || "?", reason: "unknown file or malformed edit" });
      continue;
    }
    const current = htmlByPath.get(e.file)!;
    const first = current.indexOf(e.find);
    if (first === -1) {
      failed.push({ file: e.file, reason: "'find' text not found" });
      continue;
    }
    // Replace every occurrence: repeated snippets (nav/footer) usually all
    // need the same change, and Framer duplicates markup per breakpoint.
    htmlByPath.set(e.file, current.split(e.find).join(e.replace));
    applied.push(e);
  }

  const updatedFiles = files.map((f) => {
    const doc = docByPath.get(f.path);
    if (!doc || !f.content) return f;
    let newHtml = htmlByPath.get(f.path)!;
    if (newHtml === doc.html) return f;
    // The kept Framer runtime re-renders original content on hydration, which
    // would silently undo the edit — enforce changed elements post-hydration.
    try {
      const overrides = buildOverrides(doc.html, newHtml);
      if (overrides.length > 0) newHtml = injectOverrides(newHtml, overrides);
    } catch {
      /* overrides are best-effort; the plain HTML edit still applies */
    }
    return { ...f, content: doc.wrap(newHtml, f.content) };
  });

  return { files: updatedFiles, applied, failed };
}

export async function runAiEdit(
  files: ConvertedFile[],
  instruction: string,
  onProgress: (msg: string) => void = () => {}
): Promise<AiEditResult> {
  const docs = extractDocs(files);
  if (docs.length === 0) {
    throw new Error("No editable HTML documents found in this bundle");
  }

  const { requests, skipped } = packRequests(docs);
  onProgress(
    `Analyzing ${docs.length} page(s) in ${requests.length} AI pass(es)` +
      (skipped.length ? ` (${skipped.length} left out: ${skipped.slice(0, 3).join(", ")}…)` : "") +
      "…"
  );

  const allEdits: AiEdit[] = [];
  const summaries: string[] = [];
  for (let i = 0; i < requests.length; i++) {
    if (requests.length > 1) onProgress(`AI pass ${i + 1}/${requests.length}…`);
    const raw = await callModel(buildPrompt(instruction, requests[i].join("\n\n")));
    let parsed: { edits?: AiEdit[]; summary?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("AI returned malformed JSON — try rephrasing the instruction");
    }
    if (Array.isArray(parsed.edits)) allEdits.push(...parsed.edits);
    if (parsed.summary && (parsed.edits?.length || requests.length === 1)) {
      summaries.push(parsed.summary);
    }
  }

  // Dedupe identical edits (breakpoint copies of one doc can span requests).
  const seen = new Set<string>();
  const edits = allEdits.filter((e) => {
    const key = `${e.file} ${e.find} ${e.replace}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  onProgress(`AI proposed ${edits.length} edit(s), applying…`);
  const { files: updatedFiles, applied, failed } = applyEdits(files, docs, edits);

  return {
    files: updatedFiles,
    applied,
    skippedFiles: skipped,
    failedEdits: failed,
    summary: summaries.join(" "),
  };
}
