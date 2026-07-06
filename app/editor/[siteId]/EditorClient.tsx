"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// Kept in sync with lib/overrides.ts EditorEdit (not imported — that module
// pulls in cheerio, which shouldn't ship to the browser).
type EditorEdit =
  | { kind: "text"; tag: string; oldText: string; newText: string; cls?: string }
  | { kind: "link"; oldHref: string; newHref: string }
  | { kind: "image"; oldSrc: string; newSrc: string };

type Tool = "text" | "link" | "image" | "preview";
type Breakpoint = "desktop" | "tablet" | "phone";

const BP_WIDTH: Record<Breakpoint, number> = { desktop: 1280, tablet: 834, phone: 390 };
const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: "text", label: "Text", hint: "Click any text to edit it" },
  { id: "link", label: "Link", hint: "Click a link to change where it goes" },
  { id: "image", label: "Image", hint: "Click an image to swap it" },
  { id: "preview", label: "Preview", hint: "Click through the site normally" },
];

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const framerClass = (el: Element): string | undefined =>
  (el.getAttribute("class") || "").split(/\s+/).find((c) => /^framer-[A-Za-z0-9]+$/.test(c)) ||
  undefined;

/** Climbs from a click target to the nearest editable text block. */
function textContainer(node: EventTarget | null): HTMLElement | null {
  let el = node as HTMLElement | null;
  while (el && el.nodeType === 1) {
    const cls = el.getAttribute?.("class") || "";
    if (/\bframer-text\b/.test(cls)) return el;
    if (/^(H1|H2|H3|H4|H5|H6|P|LI|BUTTON)$/.test(el.tagName)) return el;
    el = el.parentElement;
  }
  return node as HTMLElement | null;
}

export function EditorClient({
  siteId,
  siteName,
  previewBase,
  initialEdits,
  canPublish,
}: {
  siteId: string;
  siteName: string;
  previewBase: string;
  initialEdits: EditorEdit[];
  canPublish: boolean;
}) {
  const [tool, setTool] = useState<Tool>("text");
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [edits, setEdits] = useState<EditorEdit[]>(initialEdits);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ ok: boolean; text: string; url?: string } | null>(
    null
  );
  const [scale, setScale] = useState(1);
  const [frameHeight, setFrameHeight] = useState(1600);
  // In-app editor for link/image values (replaces window.prompt).
  const [dialog, setDialog] = useState<{
    kind: "link" | "image";
    el: HTMLElement;
    orig: string;
    value: string;
  } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef(tool);
  const editsRef = useRef(edits);
  // Keep the live values available to the iframe event handlers (which are
  // attached once) without re-attaching them on every change.
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    editsRef.current = edits;
  }, [edits]);

  // ---- draft autosave (debounced) ----
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(
    (next: EditorEdit[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState("saving");
      saveTimer.current = setTimeout(async () => {
        try {
          await fetch(`/api/editor/${siteId}/draft`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ edits: next }),
          });
          setSaveState("saved");
        } catch {
          setSaveState("idle");
        }
      }, 700);
    },
    [siteId]
  );

  const recordEdit = useCallback(
    (edit: EditorEdit) => {
      setEdits((prev) => {
        const idOf = (e: EditorEdit) =>
          e.kind === "text"
            ? `text|${e.tag}|${e.oldText}`
            : e.kind === "link"
              ? `link|${e.oldHref}`
              : `image|${e.oldSrc}`;
        const key = idOf(edit);
        const filtered = prev.filter((e) => idOf(e) !== key);
        // Drop no-ops (edited back to original).
        const isNoop =
          (edit.kind === "text" && norm(edit.newText) === norm(edit.oldText)) ||
          (edit.kind === "link" && edit.newHref === edit.oldHref) ||
          (edit.kind === "image" && edit.newSrc === edit.oldSrc);
        const next = isNoop ? filtered : [...filtered, edit];
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  // ---- apply the current draft to the iframe DOM (survives Framer reverts) ----
  const applyAll = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    for (const e of editsRef.current) {
      try {
        if (e.kind === "text") {
          const els = doc.getElementsByTagName((e.tag || "*").toLowerCase());
          for (let i = 0; i < els.length; i++) {
            const el = els[i] as HTMLElement;
            if (norm(el.textContent || "") === norm(e.oldText)) {
              el.setAttribute("data-fno-orig", e.oldText);
              el.innerHTML = escapeHtml(e.newText);
            }
          }
        } else if (e.kind === "link") {
          doc.querySelectorAll("a").forEach((a) => {
            if (a.getAttribute("href") === e.oldHref) {
              a.setAttribute("data-fno-orig-href", e.oldHref);
              a.setAttribute("href", e.newHref);
            }
          });
        } else if (e.kind === "image") {
          doc.querySelectorAll("img").forEach((img) => {
            const s = img.getAttribute("src");
            const ss = img.getAttribute("srcset") || "";
            if (s === e.oldSrc || ss.indexOf(e.oldSrc) >= 0) {
              img.setAttribute("data-fno-orig-src", e.oldSrc);
              img.setAttribute("src", e.newSrc);
              img.removeAttribute("srcset");
              img.removeAttribute("sizes");
            }
          });
        }
      } catch {
        /* skip */
      }
    }
  }, []);

  // ---- edit interactions inside the iframe ----
  const beginTextEdit = useCallback(
    (el: HTMLElement, doc: Document) => {
      // origKey matches the runtime's matcher (norm(textContent)); it anchors
      // the override to the ORIGINAL bundle content and never changes across
      // re-edits. origVisible is what the user currently sees (norm(innerText))
      // — used only to decide whether they actually changed anything, since
      // textContent and innerText differ by inter-block whitespace.
      const origKey = el.getAttribute("data-fno-orig") ?? norm(el.textContent || "");
      const origVisible = norm(el.innerText);
      el.setAttribute("data-fno-orig", origKey);
      el.setAttribute("contenteditable", "true");
      el.style.outline = "2px solid #2563eb";
      el.style.outlineOffset = "2px";
      el.focus();
      const sel = doc.getSelection();
      if (sel) {
        const range = doc.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const finish = () => {
        el.removeEventListener("blur", finish);
        el.removeEventListener("keydown", onKey);
        el.removeAttribute("contenteditable");
        el.style.outline = "";
        const newText = norm(el.innerText);
        if (newText && newText !== origVisible) {
          el.innerHTML = escapeHtml(newText);
          recordEdit({ kind: "text", tag: el.tagName, oldText: origKey, newText, cls: framerClass(el) });
        }
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
          ev.preventDefault();
          el.blur();
        } else if (ev.key === "Escape") {
          el.innerHTML = escapeHtml(origVisible);
          el.blur();
        }
      };
      el.addEventListener("blur", finish);
      el.addEventListener("keydown", onKey);
    },
    [recordEdit]
  );

  const editLink = useCallback((a: HTMLAnchorElement) => {
    const orig = a.getAttribute("data-fno-orig-href") ?? (a.getAttribute("href") || "");
    setDialog({ kind: "link", el: a, orig, value: a.getAttribute("href") || orig });
  }, []);

  const editImage = useCallback((img: HTMLImageElement) => {
    const orig = img.getAttribute("data-fno-orig-src") ?? (img.getAttribute("src") || "");
    setDialog({ kind: "image", el: img, orig, value: img.getAttribute("src") || orig });
  }, []);

  const applyDialog = useCallback(() => {
    if (!dialog) return;
    const value = dialog.value.trim();
    if (dialog.kind === "link") {
      dialog.el.setAttribute("data-fno-orig-href", dialog.orig);
      dialog.el.setAttribute("href", value);
      recordEdit({ kind: "link", oldHref: dialog.orig, newHref: value });
    } else {
      if (!value) {
        setDialog(null);
        return;
      }
      dialog.el.setAttribute("data-fno-orig-src", dialog.orig);
      dialog.el.setAttribute("src", value);
      dialog.el.removeAttribute("srcset");
      dialog.el.removeAttribute("sizes");
      recordEdit({ kind: "image", oldSrc: dialog.orig, newSrc: value });
    }
    setDialog(null);
  }, [dialog, recordEdit]);

  // ---- wire the iframe on load (and re-wire on internal navigation) ----
  const onFrameLoad = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const onClick = (e: MouseEvent) => {
      const t = toolRef.current;
      if (t === "preview") return;
      const target = e.target as HTMLElement;
      if (t === "text") {
        const el = textContainer(target);
        if (!el) return;
        e.preventDefault();
        e.stopPropagation();
        beginTextEdit(el, doc);
      } else if (t === "link") {
        const a = target.closest("a");
        if (!a) return;
        e.preventDefault();
        e.stopPropagation();
        editLink(a as HTMLAnchorElement);
      } else if (t === "image") {
        const img = (target.tagName === "IMG" ? target : target.closest("img")) as HTMLImageElement | null;
        if (!img) return;
        e.preventDefault();
        e.stopPropagation();
        editImage(img);
      }
    };
    let hovered: HTMLElement | null = null;
    const onMove = (e: MouseEvent) => {
      const t = toolRef.current;
      if (hovered) {
        hovered.style.removeProperty("outline");
        hovered = null;
      }
      if (t === "preview") return;
      const target = e.target as HTMLElement;
      const cand =
        t === "text"
          ? textContainer(target)
          : t === "link"
            ? (target.closest("a") as HTMLElement | null)
            : (target.tagName === "IMG" ? target : (target.closest("img") as HTMLElement | null));
      if (cand) {
        cand.style.outline = "1.5px dashed rgba(37,99,235,0.6)";
        hovered = cand;
      }
    };
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("mousemove", onMove, true);

    // Apply the draft repeatedly for a few seconds to beat Framer's hydration.
    let n = 0;
    applyAll();
    const iv = setInterval(() => {
      applyAll();
      if (++n > 12) clearInterval(iv);
    }, 500);

    // Natural full-page height for scaling.
    const measure = () => {
      try {
        const h = doc.body?.scrollHeight || 1600;
        setFrameHeight(Math.max(600, h));
      } catch {
        /* ignore */
      }
    };
    setTimeout(measure, 1200);
    setTimeout(measure, 3000);
  }, [applyAll, beginTextEdit, editImage, editLink]);

  // Re-apply the draft when it changes or breakpoint switches.
  useEffect(() => {
    applyAll();
  }, [edits, breakpoint, applyAll]);

  // ---- responsive scaling to fit the pane ----
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    const recompute = () => {
      const avail = pane.clientWidth - 48;
      setScale(Math.min(1, avail / BP_WIDTH[breakpoint]));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(pane);
    return () => ro.disconnect();
  }, [breakpoint]);

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    setPublishMsg(null);
    try {
      const res = await fetch(`/api/editor/${siteId}/publish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Publish failed");
      setPublishMsg({
        ok: true,
        text: `Published ${json.edits} change${json.edits === 1 ? "" : "s"} live.`,
        url: json.deployedUrl,
      });
    } catch (e) {
      setPublishMsg({ ok: false, text: e instanceof Error ? e.message : "Publish failed" });
    } finally {
      setPublishing(false);
    }
  }

  function discardAll() {
    if (!confirm("Discard all unpublished changes and reload the original?")) return;
    setEdits([]);
    scheduleSave([]);
    const iframe = iframeRef.current;
    if (iframe) iframe.src = previewBase + "?r=" + Date.now();
  }

  const activeHint = TOOLS.find((t) => t.id === tool)?.hint || "";

  return (
    <div className="flex h-screen flex-col bg-muted/40">
      {/* Toolbar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-2.5">
        <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <span className="text-[13px] font-medium">{siteName}</span>

        <div className="ml-2 flex gap-1 rounded-md bg-muted p-0.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`rounded px-2.5 py-1 text-[12.5px] ${
                tool === t.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-md bg-muted p-0.5">
          {(["desktop", "tablet", "phone"] as Breakpoint[]).map((b) => (
            <button
              key={b}
              onClick={() => setBreakpoint(b)}
              title={`${BP_WIDTH[b]}px`}
              className={`rounded px-2.5 py-1 text-[12.5px] capitalize ${
                breakpoint === b ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        <span className="text-[12px] text-muted-foreground">{activeHint}</span>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px] text-muted-foreground">
            {edits.length} change{edits.length === 1 ? "" : "s"}
            {saveState === "saving" ? " · saving…" : saveState === "saved" ? " · saved" : ""}
          </span>
          {edits.length > 0 && (
            <button
              onClick={discardAll}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-[12.5px] hover:border-foreground"
            >
              Discard
            </button>
          )}
          <button
            onClick={publish}
            disabled={publishing || edits.length === 0 || !canPublish}
            title={
              !canPublish
                ? "Deploy this site once with “Save deploy for live editing” checked to enable publishing."
                : ""
            }
            className="rounded-lg bg-foreground px-4 py-1.5 text-[13px] font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </header>

      {publishMsg && (
        <div
          className={`px-4 py-2 text-[12.5px] ${
            publishMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {publishMsg.text}
          {publishMsg.url && (
            <>
              {" "}
              <a href={publishMsg.url} target="_blank" rel="noopener noreferrer" className="underline">
                {publishMsg.url}
              </a>
            </>
          )}
        </div>
      )}
      {!canPublish && (
        <div className="bg-amber-50 px-4 py-2 text-[12.5px] text-amber-800">
          Editing is live-previewed here. To publish to your real site, deploy it once from the
          converter with “Save deploy for live editing” checked.
        </div>
      )}

      {/* Canvas */}
      <div ref={paneRef} className="relative flex-1 overflow-auto p-6">
        <div className="mx-auto" style={{ width: BP_WIDTH[breakpoint] * scale }}>
          <div
            style={{
              width: BP_WIDTH[breakpoint],
              height: frameHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            className="overflow-hidden rounded-lg border border-border bg-white shadow-sm"
          >
            <iframe
              ref={iframeRef}
              src={previewBase}
              onLoad={onFrameLoad}
              title="Site editor"
              style={{ width: BP_WIDTH[breakpoint], height: frameHeight, border: 0 }}
            />
          </div>
        </div>
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDialog(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[14px] font-medium">
              {dialog.kind === "link" ? "Change link" : "Change image"}
            </h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {dialog.kind === "link"
                ? "Where should this link go? (a URL or a path like /contact)"
                : "Paste a public image URL to swap it."}
            </p>
            {dialog.kind === "image" && dialog.value && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dialog.value}
                alt=""
                className="mt-2 max-h-32 rounded border border-border object-contain"
              />
            )}
            <input
              autoFocus
              value={dialog.value}
              onChange={(e) => setDialog((d) => (d ? { ...d, value: e.target.value } : d))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyDialog();
                if (e.key === "Escape") setDialog(null);
              }}
              placeholder={dialog.kind === "link" ? "https://… or /path" : "https://…/image.jpg"}
              className="mt-3 h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[13px] outline-none focus:border-foreground"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setDialog(null)}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={applyDialog}
                className="rounded-lg bg-foreground px-3 py-1.5 text-[13px] font-medium text-background"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
