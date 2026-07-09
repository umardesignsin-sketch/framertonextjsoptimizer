"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// Mirror of lib/overrides.ts EditorEdit (not imported — that module pulls in
// cheerio, which shouldn't ship to the browser).
type EditorEdit =
  | { kind: "text"; tag: string; oldText: string; newText: string; cls?: string }
  | { kind: "link"; oldHref: string; newHref: string }
  | { kind: "image"; oldSrc: string; newSrc: string };

type Tool = "text" | "link" | "image" | "preview";
type LeftTab = "pages" | "layers" | "assets";

const FRAMES: { bp: string; w: number }[] = [
  { bp: "Desktop", w: 1280 },
  { bp: "Tablet", w: 834 },
  { bp: "Phone", w: 390 },
];
const GAP = 72;
const LABEL_H = 34;

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: "text", label: "Text", hint: "Click any text to edit it" },
  { id: "link", label: "Link", hint: "Click a link to change where it goes" },
  { id: "image", label: "Image", hint: "Click an image to swap it" },
  { id: "preview", label: "Preview", hint: "Interact with the live site — effects run" },
];

/** Pointer events the editing shield swallows so the page's own listeners
 *  (cursor ripples, hover effects, custom cursors) never fire while editing.
 *  wheel/touchmove are included to starve smooth-scroll hijackers (Lenis
 *  etc.) that would scroll the artboard's content virtually — propagation is
 *  stopped but the native default is kept, so the browser still chains the
 *  scroll to the outer canvas. */
const SHIELD_BLOCKED = [
  "pointermove",
  "pointerdown",
  "pointerup",
  "pointerover",
  "pointerout",
  "mousedown",
  "mouseup",
  "mouseover",
  "mouseout",
  "dblclick",
  "contextmenu",
  "wheel",
  "touchmove",
] as const;

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const framerClass = (el: Element): string | undefined =>
  (el.getAttribute("class") || "").split(/\s+/).find((c) => /^framer-[A-Za-z0-9]+$/.test(c)) ||
  undefined;

function textContainer(node: EventTarget | null): HTMLElement | null {
  let el = node as HTMLElement | null;
  while (el && el.nodeType === 1) {
    const cls = el.getAttribute?.("class") || "";
    if (/\bframer-text\b/.test(cls)) return el;
    if (/^(H1|H2|H3|H4|H5|H6|P|LI|BUTTON)$/.test(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
}

function pageLabel(route: string): string {
  if (route === "/" || route === "") return "Home";
  return route;
}

export function EditorClient({
  siteId,
  siteName,
  pages,
  initialEdits,
  canPublish,
}: {
  siteId: string;
  siteName: string;
  previewBase: string;
  pages: { route: string; path: string }[];
  initialEdits: EditorEdit[];
  canPublish: boolean;
}) {
  const [tool, setTool] = useState<Tool>("text");
  const [leftTab, setLeftTab] = useState<LeftTab>("pages");
  const [pagePath, setPagePath] = useState(pages[0]?.path || "");
  const [edits, setEdits] = useState<EditorEdit[]>(initialEdits);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ ok: boolean; text: string; url?: string } | null>(
    null
  );
  const [zoom, setZoom] = useState(0.4);
  const [heights, setHeights] = useState<number[]>(FRAMES.map(() => 1600));
  const [dialog, setDialog] = useState<{
    kind: "link" | "image";
    el: HTMLElement;
    orig: string;
    value: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const frameRefs = useRef<(HTMLIFrameElement | null)[]>([]);
  const toolRef = useRef(tool);
  const editsRef = useRef(edits);
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

  // ---- image upload (drag & drop / file picker) ----
  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      if (!file.type.startsWith("image/")) throw new Error("Not an image file");
      const res = await fetch(`/api/editor/${siteId}/upload`, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Upload failed");
      return json.url as string;
    },
    [siteId]
  );

  /** Upload a file picked/dropped in the image dialog into the URL field. */
  const handleDialogFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const url = await uploadImage(file);
        setDialog((d) => (d ? { ...d, value: url } : d));
      } catch (e) {
        alert(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [uploadImage]
  );

  /** Upload a dropped file and swap it into an <img> on the canvas. */
  const uploadAndSwap = useCallback(
    async (file: File, img: HTMLImageElement) => {
      const orig = img.getAttribute("data-fno-orig-src") ?? (img.getAttribute("src") || "");
      const prevOpacity = img.style.opacity;
      img.style.opacity = "0.4";
      try {
        const url = await uploadImage(file);
        img.setAttribute("data-fno-orig-src", orig);
        img.setAttribute("src", url);
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        recordEdit({ kind: "image", oldSrc: orig, newSrc: url });
      } catch (e) {
        alert(e instanceof Error ? e.message : "Upload failed");
      } finally {
        img.style.opacity = prevOpacity;
      }
    },
    [uploadImage, recordEdit]
  );

  // ---- apply the current draft to every frame (survives Framer reverts) ----
  const applyAll = useCallback(() => {
    for (const iframe of frameRefs.current) {
      const doc = iframe?.contentDocument;
      if (!doc) continue;
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
    }
  }, []);

  // ---- edit interactions ----
  const beginTextEdit = useCallback(
    (el: HTMLElement, doc: Document) => {
      // Let the caret/typing reach the element while editing.
      const shield = doc.getElementById("fno-shield") as HTMLElement | null;
      if (shield) shield.style.pointerEvents = "none";
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
        if (shield) shield.style.pointerEvents = "";
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
      if (!value) return setDialog(null);
      dialog.el.setAttribute("data-fno-orig-src", dialog.orig);
      dialog.el.setAttribute("src", value);
      dialog.el.removeAttribute("srcset");
      dialog.el.removeAttribute("sizes");
      recordEdit({ kind: "image", oldSrc: dialog.orig, newSrc: value });
    }
    setDialog(null);
  }, [dialog, recordEdit]);

  // ---- wire a frame's document on load ----
  const wireFrame = useCallback(
    (index: number) => {
      const doc = frameRefs.current[index]?.contentDocument;
      if (!doc || !doc.body) return;
      if (doc.getElementById("fno-shield")) return; // already wired

      // Editing shield: a transparent layer above the page that swallows all
      // pointer events while an editing tool is active. The page never sees
      // the mouse, so hover states, cursor-follow effects (ripples), and
      // custom cursors stay off — the canvas is calm like Framer's, but the
      // site still renders fully live underneath. Preview hides the shield.
      const shield = doc.createElement("div");
      shield.id = "fno-shield";
      shield.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;background:transparent;cursor:default;display:" +
        (toolRef.current === "preview" ? "none" : "block");
      // Attach to <html>, not <body>: Framer's hydration re-renders body
      // children and would strip the shield. Re-attach if anything removes it.
      doc.documentElement.appendChild(shield);
      new MutationObserver(() => {
        if (!shield.isConnected) doc.documentElement.appendChild(shield);
      }).observe(doc.documentElement, { childList: true });

      // Everything stacked under the cursor (shield excluded). Scanning the
      // whole stack lets tools pick text/links/images that sit UNDER effect
      // layers like full-page WebGL canvases.
      const pickStack = (x: number, y: number): HTMLElement[] => {
        shield.style.pointerEvents = "none";
        const els = doc.elementsFromPoint(x, y) as HTMLElement[];
        shield.style.pointerEvents = "";
        return els.filter((el) => el !== shield);
      };

      // Resolve the first element in the stack the active tool can act on.
      const resolveTarget = (x: number, y: number): HTMLElement | null => {
        const t = toolRef.current;
        for (const el of pickStack(x, y)) {
          const m =
            t === "text"
              ? textContainer(el)
              : t === "link"
                ? (el.closest("a") as HTMLElement | null)
                : t === "image"
                  ? ((el.tagName === "IMG" ? el : el.closest("img")) as HTMLElement | null)
                  : null;
          if (m) return m;
        }
        return null;
      };

      for (const type of SHIELD_BLOCKED) {
        shield.addEventListener(type, (e) => e.stopPropagation());
      }

      shield.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const t = toolRef.current;
        if (t === "preview") return;
        const target = resolveTarget(e.clientX, e.clientY);
        if (!target) return;
        if (t === "text") beginTextEdit(target, doc);
        else if (t === "link") editLink(target as HTMLAnchorElement);
        else if (t === "image") editImage(target as HTMLImageElement);
      });

      let hovered: HTMLElement | null = null;
      shield.addEventListener("mousemove", (e) => {
        e.stopPropagation();
        if (hovered) {
          hovered.style.removeProperty("outline");
          hovered = null;
        }
        if (toolRef.current === "preview") return;
        const cand = resolveTarget(e.clientX, e.clientY);
        if (cand) {
          cand.style.outline = "1.5px dashed rgba(37,99,235,0.7)";
          hovered = cand;
        }
      });

      // Drag & drop an image file straight onto any <img> to replace it —
      // works with every tool. The drop target highlights while dragging.
      const imgUnder = (x: number, y: number): HTMLImageElement | null => {
        for (const el of pickStack(x, y)) {
          const img = (el.tagName === "IMG" ? el : el.closest("img")) as HTMLImageElement | null;
          if (img) return img;
        }
        return null;
      };
      shield.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hovered) {
          hovered.style.removeProperty("outline");
          hovered = null;
        }
        const img = imgUnder(e.clientX, e.clientY);
        if (img) {
          img.style.outline = "2.5px solid #2563eb";
          hovered = img;
        }
      });
      shield.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hovered) {
          hovered.style.removeProperty("outline");
          hovered = null;
        }
        const file = e.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        const img = imgUnder(e.clientX, e.clientY);
        if (img) void uploadAndSwap(file, img);
      });

      let n = 0;
      applyAll();
      const iv = setInterval(() => {
        applyAll();
        if (++n > 12) clearInterval(iv);
      }, 500);

      // ---- full-page artboards (no internal scrolling) ----------------
      // Two things make frames scroll internally instead of the canvas:
      // 1. vh-sized sections grow with the iframe, so expanding the frame
      //    to fit content grows the content again (feedback loop). Freeze
      //    vh units at a fixed design viewport, like Framer's artboards.
      // 2. Framer smooth-scroll wraps the page in a fixed-height inner
      //    scroller, so body.scrollHeight lies about the true page height.
      //    Measure the tallest scroller in the document instead.
      const DESIGN_VH = 900; // design viewport height, px per 100vh
      const fixVh = (css: string) =>
        css.replace(/(-?\d*\.?\d+)(d|s|l)?vh\b/g, (_m, num) => `${(parseFloat(num) / 100) * DESIGN_VH}px`);
      const fixRules = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          try {
            const nested = (rule as CSSMediaRule).cssRules;
            if (nested) fixRules(nested);
            const st = (rule as CSSStyleRule).style;
            if (!st) continue;
            for (let i = st.length - 1; i >= 0; i--) {
              const prop = st[i];
              const val = st.getPropertyValue(prop);
              if (/\d(d|s|l)?vh\b/.test(val)) st.setProperty(prop, fixVh(val), st.getPropertyPriority(prop));
            }
          } catch {
            /* unwritable rule — skip it, keep going */
          }
        }
      };
      const freezeVh = () => {
        for (const sheet of Array.from(doc.styleSheets)) {
          try {
            fixRules(sheet.cssRules);
          } catch {
            /* cross-origin sheet — skip */
          }
        }
        doc.querySelectorAll('[style*="vh"]').forEach((el) => {
          const s = el.getAttribute("style") || "";
          if (/\d(d|s|l)?vh\b/.test(s)) el.setAttribute("style", fixVh(s));
        });
      };
      // Appear/scroll-reveal elements wait for a scroll that never happens on
      // a full-height artboard, staying invisible (blank hero). Reveal them:
      // opacity only — transforms stay untouched so layout can't break.
      const revealAppear = () => {
        doc.querySelectorAll("[data-framer-appear-id]").forEach((el) => {
          const cs = doc.defaultView!.getComputedStyle(el);
          if (parseFloat(cs.opacity) < 0.5) (el as HTMLElement).style.setProperty("opacity", "1", "important");
        });
      };
      // Some bundles pin the page inside a fixed-height scroll wrapper
      // (smooth-scroll). After vh is frozen those wrappers stay short and
      // scroll internally no matter how tall the artboard is — expand them.
      const expandScrollers = () => {
        const els = [doc.documentElement, doc.body, ...Array.from(doc.body?.querySelectorAll("div,main,section") || [])];
        for (const el of els as HTMLElement[]) {
          if (!el) continue;
          if (el.scrollHeight <= el.clientHeight + 60) continue;
          const cs = doc.defaultView!.getComputedStyle(el);
          if (cs.overflowY === "auto" || cs.overflowY === "scroll" || (el === doc.body && cs.overflow === "hidden")) {
            el.style.setProperty("height", "auto", "important");
            el.style.setProperty("max-height", "none", "important");
            el.style.setProperty("overflow-y", "visible", "important");
          }
        }
      };

      const measure = () => {
        try {
          // Guarded separately: a style quirk must never abort measuring.
          try {
            freezeVh(); // re-run: hydration may inject fresh vh styles late
          } catch {
            /* ignore */
          }
          try {
            expandScrollers();
          } catch {
            /* ignore */
          }
          try {
            revealAppear();
          } catch {
            /* ignore */
          }
          let h = Math.max(doc.documentElement?.scrollHeight || 0, doc.body?.scrollHeight || 0);
          doc.body?.querySelectorAll("div,main,section").forEach((el) => {
            if (el.scrollHeight > h) h = el.scrollHeight;
          });
          h = Math.min(Math.max(600, h || 1600), 40000);
          setHeights((prev) => {
            if (Math.abs((prev[index] || 0) - h) < 4) return prev;
            const next = [...prev];
            next[index] = h;
            return next;
          });
        } catch {
          /* ignore */
        }
      };
      freezeVh();
      setTimeout(measure, 400);
      setTimeout(measure, 1200);
      setTimeout(measure, 3000);
      setTimeout(measure, 6000);
    },
    [applyAll, beginTextEdit, editImage, editLink, uploadAndSwap]
  );

  useEffect(() => {
    applyAll();
  }, [edits, applyAll]);

  // Wire frames by polling instead of trusting <iframe onLoad>: fast local
  // loads can finish before hydration attaches the handler, losing the event.
  // wireFrame is idempotent (skips already-wired docs), and the poll also
  // re-wires after in-frame navigation (e.g. clicking links in Preview).
  useEffect(() => {
    const iv = setInterval(() => {
      frameRefs.current.forEach((f, i) => {
        try {
          const d = f?.contentDocument;
          if (d && d.readyState === "complete" && d.body && !d.getElementById("fno-shield")) {
            wireFrame(i);
          }
        } catch {
          /* frame not ready */
        }
      });
    }, 300);
    return () => clearInterval(iv);
  }, [wireFrame]);

  // Show/hide each frame's editing shield when the tool changes. No reload —
  // the same live page stays put; Preview just lets the mouse through.
  useEffect(() => {
    for (const f of frameRefs.current) {
      try {
        const sh = f?.contentDocument?.getElementById("fno-shield") as HTMLElement | null;
        if (sh) sh.style.display = tool === "preview" ? "none" : "block";
      } catch {
        /* frame not ready */
      }
    }
  }, [tool]);

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
    setPagePath((p) => p + (p.includes("?") ? "&" : "?") + "r=" + Date.now());
  }

  const rowW = FRAMES.reduce((s, f) => s + f.w, 0) + GAP * (FRAMES.length - 1);
  const rowH = Math.max(...heights) + LABEL_H;
  const activeHint = TOOLS.find((t) => t.id === tool)?.hint || "";

  return (
    <div className="flex h-screen flex-col bg-[#111113] text-neutral-200">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#2a2a2e] bg-[#161618] px-3 text-[13px]">
        <Link href="/dashboard" className="flex h-6 w-6 items-center justify-center rounded bg-[#2a2a2e] text-[13px] font-bold hover:bg-[#333]">
          ←
        </Link>
        <div className="flex items-center gap-1 rounded bg-[#2a2a2e] px-2 py-1">
          <span className="text-[12px] font-medium">Canvas</span>
        </div>
        <div className="mx-auto flex items-center gap-2 text-[12.5px] text-neutral-300">
          <span className="font-medium">{siteName}</span>
          <span className="text-neutral-500">· {pageLabel(pages.find((p) => p.path === pagePath)?.route || "/")}</span>
        </div>
        {/* tools */}
        <div className="flex gap-0.5 rounded-md bg-[#0e0e10] p-0.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.hint}
              className={`rounded px-2 py-1 text-[12px] ${
                tool === t.id ? "bg-[#2a2a2e] font-medium text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={publish}
          disabled={publishing || edits.length === 0 || !canPublish}
          title={!canPublish ? "Deploy this site once with “Save deploy for live editing” checked." : ""}
          className="rounded-md bg-blue-600 px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publishing ? "Publishing…" : "Publish"}
        </button>
      </header>

      {publishMsg && (
        <div className={`px-4 py-1.5 text-[12px] ${publishMsg.ok ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"}`}>
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

      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-[#2a2a2e] bg-[#161618]">
          <div className="flex gap-4 border-b border-[#2a2a2e] px-3 py-2 text-[12.5px]">
            {(["pages", "layers", "assets"] as LeftTab[]).map((tb) => (
              <button
                key={tb}
                onClick={() => setLeftTab(tb)}
                className={`capitalize ${leftTab === tb ? "font-medium text-white" : "text-neutral-500 hover:text-neutral-300"}`}
              >
                {tb}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-2 text-[12.5px]">
            {leftTab === "pages" ? (
              <ul className="space-y-0.5">
                {pages.map((p) => (
                  <li key={p.route}>
                    <button
                      onClick={() => setPagePath(p.path)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${
                        p.path === pagePath ? "bg-[#2a2a2e] text-white" : "text-neutral-300 hover:bg-[#1e1e21]"
                      }`}
                    >
                      <span className="text-neutral-500">{p.route === "/" ? "⌂" : "▤"}</span>
                      {pageLabel(p.route)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 py-4 text-neutral-500">
                {leftTab === "layers"
                  ? "Layer tree isn’t editable in this version — use the Text/Link/Image tools directly on the canvas."
                  : "Asset management is coming soon. Swap images with the Image tool."}
              </p>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <main className="relative min-w-0 flex-1 overflow-auto bg-[#0d0d0f]">
          <div className="p-16" style={{ width: rowW * zoom + 128, height: rowH * zoom + 128 }}>
            <div style={{ width: rowW, transform: `scale(${zoom})`, transformOrigin: "top left" }} className="flex" >
              {FRAMES.map((f, i) => (
                <div key={f.bp} style={{ width: f.w, marginRight: i < FRAMES.length - 1 ? GAP : 0 }}>
                  <div className="mb-2 flex items-center gap-2 text-[15px] text-neutral-400">
                    <span>▷</span>
                    <span className="font-medium text-neutral-300">{f.bp}</span>
                    <span className="text-neutral-600">{f.w}</span>
                  </div>
                  <div
                    className="overflow-hidden rounded-md bg-white shadow-2xl ring-1 ring-black/40"
                    style={{ width: f.w, height: heights[i] }}
                  >
                    <iframe
                      ref={(el) => {
                        frameRefs.current[i] = el;
                      }}
                      src={pagePath}
                      onLoad={() => wireFrame(i)}
                      title={`${f.bp} preview`}
                      style={{ width: f.w, height: heights[i], border: 0 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* zoom + hint bar */}
          <div className="pointer-events-none sticky bottom-0 left-0 flex items-center justify-between px-4 py-2">
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#161618]/95 px-2 py-1 text-[12px]">
              <button onClick={() => setZoom((z) => Math.max(0.1, +(z - 0.05).toFixed(2)))} className="px-1 text-neutral-300 hover:text-white">
                −
              </button>
              <span className="w-10 text-center text-neutral-400">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(1, +(z + 0.05).toFixed(2)))} className="px-1 text-neutral-300 hover:text-white">
                +
              </button>
              <button onClick={() => setZoom(0.4)} className="ml-1 rounded px-1.5 text-neutral-500 hover:text-neutral-300">
                Fit
              </button>
            </div>
            <div className="pointer-events-auto rounded-lg border border-[#2a2a2e] bg-[#161618]/95 px-3 py-1 text-[12px] text-neutral-400">
              {activeHint}
            </div>
          </div>
        </main>

        {/* Right panel */}
        <aside className="flex w-64 shrink-0 flex-col border-l border-[#2a2a2e] bg-[#161618]">
          <div className="flex items-center justify-between border-b border-[#2a2a2e] px-3 py-2 text-[12.5px]">
            <span className="font-medium text-white">Changes</span>
            <span className="text-neutral-500">
              {edits.length}
              {saveState === "saving" ? " · saving…" : saveState === "saved" ? " · saved" : ""}
            </span>
          </div>
          <div className="flex-1 overflow-auto p-2 text-[12px]">
            {edits.length === 0 ? (
              <p className="px-1 py-3 text-neutral-500">
                No changes yet. Pick a tool and click text, a link, or an image on the canvas.
              </p>
            ) : (
              <ul className="space-y-1">
                {edits.map((e, i) => (
                  <li key={i} className="rounded bg-[#1e1e21] px-2 py-1.5">
                    <span className="mr-1.5 rounded bg-[#2a2a2e] px-1 py-0.5 text-[10px] uppercase text-neutral-400">
                      {e.kind}
                    </span>
                    <span className="text-neutral-300">
                      {e.kind === "text"
                        ? `“${e.newText.slice(0, 24)}”`
                        : e.kind === "link"
                          ? e.newHref.slice(0, 30)
                          : "image swapped"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-[#2a2a2e] p-2">
            {edits.length > 0 && (
              <button
                onClick={discardAll}
                className="w-full rounded-md border border-[#2a2a2e] px-3 py-1.5 text-[12px] text-neutral-300 hover:border-neutral-500"
              >
                Discard all changes
              </button>
            )}
            {!canPublish && (
              <p className="mt-2 text-[11.5px] text-amber-400/90">
                Deploy this site once with “Save deploy for live editing” checked to enable Publish.
              </p>
            )}
          </div>
        </aside>
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDialog(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[14px] font-medium text-white">
              {dialog.kind === "link" ? "Change link" : "Change image"}
            </h3>
            <p className="mt-1 text-[12px] text-neutral-400">
              {dialog.kind === "link"
                ? "Where should this link go? A URL or a path like /contact."
                : "Drop an image file, browse, or paste a public image URL."}
            </p>
            {dialog.kind === "image" && (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleDialogFile(f);
                }}
                className={`mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-4 text-center text-[12.5px] transition-colors ${
                  uploading
                    ? "border-blue-500/60 text-blue-300"
                    : "border-[#3a3a3f] text-neutral-400 hover:border-blue-500/70 hover:text-neutral-200"
                }`}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleDialogFile(f);
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <span>Uploading…</span>
                ) : (
                  <>
                    <span className="font-medium text-neutral-300">Drop an image here or click to browse</span>
                    <span className="text-[11.5px] text-neutral-500">PNG, JPG, WebP, GIF, SVG · up to 8 MB</span>
                  </>
                )}
              </label>
            )}
            {dialog.kind === "image" && dialog.value && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dialog.value} alt="" className="mt-2 max-h-32 rounded border border-[#2a2a2e] object-contain" />
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
              className="mt-3 h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0e0e10] px-3 text-[13px] text-neutral-100 outline-none focus:border-blue-500"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setDialog(null)} className="rounded-lg border border-[#2a2a2e] px-3 py-1.5 text-[13px] text-neutral-300">
                Cancel
              </button>
              <button onClick={applyDialog} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-500">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
