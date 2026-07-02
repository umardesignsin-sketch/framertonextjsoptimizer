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
import type { ConvertedFile } from "./types";
import { geminiJson } from "./gemini";

/** Per-document and total character budgets sent to the model. */
const MAX_DOC_CHARS = 700_000;
const MAX_TOTAL_CHARS = 900_000;

const NEXTJS_HTML_RE = /const HTML = ("(?:[^"\\]|\\.)*");/;

interface EditableDoc {
  /** Bundle file path the doc came from. */
  path: string;
  /** The HTML text shown to the model. */
  html: string;
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

function extractDocs(files: ConvertedFile[]): { docs: EditableDoc[]; skipped: string[] } {
  const docs: EditableDoc[] = [];
  const skipped: string[] = [];
  let budget = MAX_TOTAL_CHARS;

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
    if (html.length > MAX_DOC_CHARS || html.length > budget) {
      skipped.push(f.path);
      continue;
    }
    budget -= html.length;
    docs.push({ path: f.path, html, wrap });
  }

  return { docs, skipped };
}

function buildPrompt(instruction: string, docs: EditableDoc[]): string {
  const fileBlocks = docs
    .map((d) => `=== FILE: ${d.path} ===\n${d.html}`)
    .join("\n\n");

  return `You are an expert web developer editing a static website snapshot exported from Framer.

USER INSTRUCTION:
${instruction}

Below are the site's HTML documents. Apply the instruction by producing precise text edits.

RULES:
- Reply ONLY with JSON matching: {"edits":[{"file":"<path>","find":"<exact substring>","replace":"<replacement>"}],"summary":"<one or two sentences describing what you changed>"}
- "find" MUST be copied verbatim from the file content (exact characters, including whitespace) and SHOULD be unique within that file. Include enough surrounding context to make it unique.
- Keep edits minimal and surgical. Do NOT reformat or rewrite unrelated markup.
- Preserve all Framer attributes, classes, script tags, and structure unless the instruction requires changing them.
- If the instruction cannot be fulfilled with the given files, return {"edits":[],"summary":"<explain why>"}.

${fileBlocks}`;
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
    const newHtml = htmlByPath.get(f.path)!;
    if (newHtml === doc.html) return f;
    return { ...f, content: doc.wrap(newHtml, f.content) };
  });

  return { files: updatedFiles, applied, failed };
}

export async function runAiEdit(
  files: ConvertedFile[],
  instruction: string,
  onProgress: (msg: string) => void = () => {}
): Promise<AiEditResult> {
  const { docs, skipped } = extractDocs(files);
  if (docs.length === 0) {
    throw new Error(
      skipped.length
        ? "All pages are too large for AI editing right now"
        : "No editable HTML documents found in this bundle"
    );
  }

  onProgress(`Sending ${docs.length} page(s) to the AI (${skipped.length} skipped for size)…`);
  const raw = await geminiJson(buildPrompt(instruction, docs));

  let parsed: { edits?: AiEdit[]; summary?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned malformed JSON — try rephrasing the instruction");
  }
  const edits = Array.isArray(parsed.edits) ? parsed.edits : [];
  onProgress(`AI proposed ${edits.length} edit(s), applying…`);

  const { files: updatedFiles, applied, failed } = applyEdits(files, docs, edits);

  return {
    files: updatedFiles,
    applied,
    skippedFiles: skipped,
    failedEdits: failed,
    summary: parsed.summary || "",
  };
}
