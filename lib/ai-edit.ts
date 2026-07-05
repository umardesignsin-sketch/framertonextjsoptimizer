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
// documents are split across multiple sequential model calls (up to
// MAX_REQUESTS, sized to fit the API route's time budget — see maxDuration
// in app/api/ai-edit/route.ts) so large sites aren't silently left out.
//
// Reliability: Gemini's `responseSchema` (lib/gemini.ts) constrains output to
// the edits shape, which fixes plain malformed JSON. It does NOT prevent
// truncation if a pass hits the output-token limit — salvageEdits() recovers
// whatever complete edits exist in a cut-off response, and each pass is
// isolated (a failed/truncated pass logs progress and the run continues).
import type { ConvertedFile } from "./types";
import { geminiJson, GeminiRateLimitError } from "./gemini";
import { buildOverrides, injectOverrides } from "./overrides";

/** Max characters of pruned content per model request (~160K tokens — fits
 *  alone inside the free tier's ~250K tokens-per-minute window). */
const MAX_REQUEST_CHARS = 650_000;
/** Hard cap on model calls per edit run — paced passes at ~45s spacing must
 *  fit the API route's maxDuration (300s in app/api/ai-edit/route.ts). */
const MAX_REQUESTS = 6;
/** Stay under the per-minute token quota: don't start a call if tokens sent
 *  in the trailing minute plus this call would exceed the budget. */
const TPM_BUDGET_TOKENS = 200_000;
/** Attempts per pass on rate-limit responses (honoring Google's retryDelay). */
const MAX_ATTEMPTS_PER_PASS = 3;
/** Stop starting new passes past this elapsed time so applying/saving/deploy
 *  still fit inside the route's execution window. */
const RUN_TIME_BUDGET_MS = 240_000;

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
  /** Doc paths included in each request (parallel to `requests`). */
  requestPaths: string[][];
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
  const requestPaths: string[][] = [];
  const skipped = new Set<string>();
  let cur: string[] = [];
  let curPaths = new Set<string>();
  let chars = 0;

  for (const p of parts) {
    if (chars + p.text.length > MAX_REQUEST_CHARS && cur.length) {
      requests.push(cur);
      requestPaths.push([...curPaths]);
      cur = [];
      curPaths = new Set();
      chars = 0;
    }
    if (requests.length >= MAX_REQUESTS) {
      skipped.add(p.path);
      continue;
    }
    cur.push(p.text);
    curPaths.add(p.path);
    chars += p.text.length;
  }
  if (cur.length && requests.length < MAX_REQUESTS) {
    requests.push(cur);
    requestPaths.push([...curPaths]);
  }

  return { requests, requestPaths, skipped: [...skipped] };
}

function buildPrompt(instruction: string, fileBlocks: string): string {
  return `You are an expert web developer editing a static website snapshot exported from Framer.

USER INSTRUCTION:
${instruction}

Below are the site's HTML documents (scripts, styles, and svg internals are omitted; some large documents arrive in parts). Apply the instruction by producing precise text edits.

RULES:
- "file" is the path WITHOUT any "(part i of n)" suffix.
- "find" MUST be copied verbatim from the shown content (exact characters, including whitespace) and SHOULD be unique within that file. Include enough surrounding context to make it unique, but keep each "find" under ~400 characters.
- Framer duplicates markup for responsive breakpoints — the same text often appears several times. Every occurrence of "find" gets replaced, so prefer a "find" that covers exactly the repeated fragment you want changed everywhere.
- Keep edits minimal and surgical. Do NOT reformat or rewrite unrelated markup.
- Preserve all Framer attributes, classes, and structure unless the instruction requires changing them.
- If nothing in the shown content matches the instruction, return an empty "edits" array and explain why in "summary".

${fileBlocks}`;
}

/** Rolling window of (timestamp, estimated tokens) for calls already sent —
 *  used to pace passes under the per-minute token quota instead of blindly
 *  firing and eating 429s. */
const sentWindow: { at: number; tokens: number }[] = [];

function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

/** Milliseconds to wait before a call of `tokens` fits the trailing-minute budget. */
function paceDelayMs(tokens: number): number {
  const now = Date.now();
  while (sentWindow.length && now - sentWindow[0].at > 60_000) sentWindow.shift();
  let used = sentWindow.reduce((s, w) => s + w.tokens, 0);
  if (used + tokens <= TPM_BUDGET_TOKENS) return 0;
  // Find when enough of the window has expired to make room.
  for (const w of sentWindow) {
    used -= w.tokens;
    if (used + tokens <= TPM_BUDGET_TOKENS) return Math.max(0, w.at + 61_000 - now);
  }
  return 61_000;
}

/** Recovers whatever complete edit objects exist in a malformed/truncated
 *  model response (the response can still get cut off at the output-token
 *  limit even with responseSchema constraining the shape). */
export function salvageEdits(raw: string): AiEdit[] {
  const out: AiEdit[] = [];
  // Complete {...} objects with no nested braces — an edit is exactly that.
  const matches = raw.match(/\{(?:[^{}"]|"(?:[^"\\]|\\.)*")*\}/g) || [];
  for (const m of matches) {
    try {
      const o = JSON.parse(m) as Partial<AiEdit>;
      if (typeof o.file === "string" && typeof o.find === "string" && typeof o.replace === "string") {
        out.push({ file: o.file, find: o.find, replace: o.replace });
      }
    } catch {
      /* skip fragment */
    }
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callModel(prompt: string, onProgress: (msg: string) => void): Promise<string> {
  const tokens = estimateTokens(prompt.length);

  // Proactive pacing: wait for quota headroom instead of triggering a 429.
  const wait = paceDelayMs(tokens);
  if (wait > 0) {
    onProgress(`Pacing for the rate-limit window (~${Math.round(wait / 1000)}s)…`);
    await sleep(wait);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PASS; attempt++) {
    sentWindow.push({ at: Date.now(), tokens });
    try {
      return await geminiJson(prompt);
    } catch (e) {
      lastError = e;
      if (!(e instanceof GeminiRateLimitError) || attempt === MAX_ATTEMPTS_PER_PASS) throw e;
      const backoff = Math.min(e.retryAfterMs + 2_000, 60_000);
      onProgress(`Rate limited — retrying in ${Math.round(backoff / 1000)}s (attempt ${attempt + 1})…`);
      await sleep(backoff);
    }
  }
  throw lastError;
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

  const { requests, requestPaths, skipped } = packRequests(docs);
  const notAnalyzed = new Set<string>(skipped);
  onProgress(
    `Analyzing ${docs.length} page(s) in ${requests.length} AI pass(es)` +
      (skipped.length ? ` (${skipped.length} left out: ${skipped.slice(0, 3).join(", ")}…)` : "") +
      "…"
  );

  const startedAt = Date.now();
  const allEdits: AiEdit[] = [];
  const summaries: string[] = [];
  let failedPasses = 0;
  for (let i = 0; i < requests.length; i++) {
    // Leave room to apply/save/redeploy inside the route's execution window;
    // report what didn't fit instead of dying mid-run.
    if (i > 0 && Date.now() - startedAt > RUN_TIME_BUDGET_MS) {
      for (const p of requestPaths[i]) notAnalyzed.add(p);
      onProgress(`Out of time for pass ${i + 1} — run the edit again to cover the remaining pages.`);
      continue;
    }
    if (requests.length > 1) onProgress(`AI pass ${i + 1}/${requests.length}…`);
    let raw: string;
    try {
      raw = await callModel(buildPrompt(instruction, requests[i].join("\n\n")), onProgress);
    } catch (e) {
      failedPasses++;
      for (const p of requestPaths[i]) notAnalyzed.add(p);
      onProgress(
        `Pass ${i + 1} failed (${e instanceof Error ? e.message.slice(0, 80) : "error"}) — continuing…`
      );
      continue;
    }
    let parsed: { edits?: AiEdit[]; summary?: string } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Truncated/malformed response — keep whatever complete edits survive.
      const rescued = salvageEdits(raw);
      if (rescued.length) {
        allEdits.push(...rescued);
        onProgress(`Pass ${i + 1} response was truncated — recovered ${rescued.length} edit(s).`);
      } else {
        failedPasses++;
        for (const p of requestPaths[i]) notAnalyzed.add(p);
        onProgress(`Pass ${i + 1} returned a malformed response — continuing…`);
      }
      continue;
    }
    if (!parsed) continue;
    if (Array.isArray(parsed.edits)) allEdits.push(...parsed.edits);
    if (parsed.summary && (parsed.edits?.length || requests.length === 1)) {
      summaries.push(parsed.summary);
    }
  }
  if (failedPasses === requests.length) {
    throw new Error("The AI failed on every pass — try again or rephrase the instruction");
  }

  // Dedupe identical edits (breakpoint copies of one doc can span requests).
  const seen = new Set<string>();
  const edits = allEdits.filter((e) => {
    const key = `${e.file} ${e.find} ${e.replace}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  onProgress(`AI proposed ${edits.length} edit(s), applying…`);
  const { files: updatedFiles, applied, failed } = applyEdits(files, docs, edits);

  return {
    files: updatedFiles,
    applied,
    skippedFiles: [...notAnalyzed],
    failedEdits: failed,
    summary: summaries.join(" "),
  };
}
