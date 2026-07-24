"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

// Mirror of lib/overrides.ts EditorEdit (not imported — that module pulls in
// cheerio, which shouldn't ship to the browser).
type EditorEdit =
  | { kind: "text"; tag: string; oldText: string; newText: string; cls?: string }
  | { kind: "link"; oldHref: string; newHref: string }
  | { kind: "image"; oldSrc: string; newSrc: string };

type Tool = "text" | "link" | "image" | "preview";
type LeftTab = "pages" | "layers" | "assets";

interface LayerRow {
  icon: string;
  label: string;
  sub?: string;
  el: HTMLElement;
}
interface LayerTree {
  nav: LayerRow[];
  headings: LayerRow[];
  images: LayerRow[];
}

const FRAMES: { bp: string; w: number }[] = [
  { bp: "Desktop", w: 1280 },
  { bp: "Tablet", w: 834 },
  { bp: "Phone", w: 390 },
];
const GAP = 72;
const LABEL_H = 34;

const TOOLS: { id: Tool; label: string; key: string; hint: string }[] = [
  { id: "text", label: "Text", key: "T", hint: "Click any text to edit it" },
  { id: "link", label: "Link", key: "L", hint: "Click a link to change where it goes" },
  { id: "image", label: "Image", key: "I", hint: "Click an image to swap it" },
  { id: "preview", label: "Preview", key: "P", hint: "Interact with the live site — effects run" },
];

// ---- inline icon set (stroke = currentColor, sized by prop) ----------------
const ICON_PATHS: Record<string, ReactNode> = {
  text: (
    <>
      <path d="M4 7V5h16v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.1-1.1" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <path d="m21 16-5.5-5.5L6 20" />
    </>
  ),
  preview: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8.5 5.5 3.5-5.5 3.5z" />
    </>
  ),
  desktop: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  tablet: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M11 17.5h2" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  home: <path d="m3 10.5 9-7.5 9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" />,
  page: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  back: <path d="m12 19-7-7 7-7M5 12h14" />,
  check: <path d="m5 13 4 4L19 7" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </>
  ),
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M17.7 6.3l-2.5 2.5M8.8 15.2l-2.5 2.5" />,
  nav: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </>
  ),
  heading: <path d="M6 4v16M18 4v16M6 12h12" />,
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
};

function Icon({ name, size = 14, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

const BP_ICON: Record<string, string> = { Desktop: "desktop", Tablet: "tablet", Phone: "phone" };

/** One collapsible section of the read-only Layers tree — nav links,
 *  heading outline, or images — styled after Framer's Layers panel
 *  (small icon + label, indented, row highlights on hover). */
function LayerGroup({
  title,
  icon,
  rows,
  onSelect,
}: {
  title: string;
  icon: string;
  rows: LayerRow[];
  onSelect: (el: HTMLElement) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-600">
        <Icon name={icon} size={10} />
        {title}
        <span className="text-neutral-700">{rows.length}</span>
      </div>
      <ul className="mt-1 space-y-0.5">
        {rows.map((r, i) => (
          <li key={i}>
            <button
              onClick={() => onSelect(r.el)}
              className="group flex w-full items-center gap-1.5 rounded-md py-1 pl-3 pr-2 text-left transition-colors hover:bg-[#1c1c1f]"
            >
              {r.sub && r.icon === "heading" ? (
                <span className="w-4 shrink-0 text-center text-[9.5px] font-bold uppercase text-neutral-600">
                  {r.sub}
                </span>
              ) : (
                <Icon name={r.icon} size={11} className="shrink-0 text-neutral-600 group-hover:text-neutral-400" />
              )}
              <span className="min-w-0 flex-1 truncate text-neutral-300">{r.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Cache-bust a preview path so frames reload (strips any previous r= bump). */
function bumpRefresh(p: string): string {
  const base = p.replace(/([?&])r=\d+&?/, (_m, sep) => (sep === "?" ? "?" : "")).replace(/[?&]$/, "");
  return base + (base.includes("?") ? "&" : "?") + "r=" + Date.now();
}

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

/**
 * Replace an element's visible text WITHOUT flattening its markup. Nested
 * spans carry custom fonts and hover/appear effect structure — assigning
 * innerHTML would destroy them. Rewrites text nodes in place instead:
 *  - single text node → set it
 *  - several nodes where some equal the whole old text (stacked hover
 *    copies) → set each copy
 *  - text split across spans → set the first node, blank the rest
 */
function setTextPreserving(el: HTMLElement, newText: string, oldKey: string) {
  const doc = el.ownerDocument;
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (norm((n as Text).data || "")) nodes.push(n as Text);
  }
  if (nodes.length === 0) {
    el.textContent = newText;
    return;
  }
  let hit = false;
  for (const node of nodes) {
    if (norm(node.data) === oldKey) {
      node.data = newText;
      hit = true;
    }
  }
  if (!hit) {
    nodes[0].data = newText;
    for (let i = 1; i < nodes.length; i++) nodes[i].data = "";
  }
}
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
  // Which breakpoint artboards are shown. All iframes stay mounted (hidden via
  // CSS) so the wiring, measured heights, and refs stay stable.
  const [visibleBps, setVisibleBps] = useState<Set<string>>(() => new Set(FRAMES.map((f) => f.bp)));
  const [layerTree, setLayerTree] = useState<LayerTree | null>(null);

  const frameRefs = useRef<(HTMLIFrameElement | null)[]>([]);
  const canvasRef = useRef<HTMLElement | null>(null);
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

  /** Remove a single edit and reload frames so the element reverts; the
   *  remaining edits re-apply automatically once the frames re-wire. */
  const removeEdit = useCallback(
    (index: number) => {
      setEdits((prev) => {
        const next = prev.filter((_, i) => i !== index);
        scheduleSave(next);
        return next;
      });
      setPagePath((p) => bumpRefresh(p));
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
                setTextPreserving(el, e.newText, norm(e.oldText));
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
      // Snapshot the markup: contenteditable typing can merge/split nodes, so
      // we restore this structure on finish and re-apply only the text.
      const origHTML = el.innerHTML;
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
        // Put the original markup back (typing may have mangled it), then
        // apply the new text through the preserved structure.
        el.innerHTML = origHTML;
        if (newText && newText !== origVisible) {
          setTextPreserving(el, newText, origVisible);
          recordEdit({ kind: "text", tag: el.tagName, oldText: origKey, newText, cls: framerClass(el) });
        }
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
          ev.preventDefault();
          el.blur();
        } else if (ev.key === "Escape") {
          el.innerHTML = origHTML;
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
        // Framer animation start-states — appear effects, scroll-reveals, and
        // per-letter text effects — park an element at a low inline opacity
        // with a transform (translate/scale) and/or blur, waiting for a scroll
        // or timeline that never fires on a static artboard. Reveal every
        // inline-hidden element to its resting state (opacity 1, no transform,
        // no blur). Inline opacity < 1 is the reliable discriminator: elements
        // that use transform purely for LAYOUT keep opacity 1, so they're left
        // untouched and positioning can't break. This is exactly the final
        // state Framer's own runtime animates these into.
        doc.querySelectorAll<HTMLElement>('[style*="opacity"]').forEach((el) => {
          const st = el.style;
          if (!st.opacity || parseFloat(st.opacity) >= 0.5) return;
          st.setProperty("opacity", "1", "important");
          if (st.transform && st.transform !== "none") st.setProperty("transform", "none", "important");
          if ((st.filter || "").includes("blur")) st.setProperty("filter", "none", "important");
          el.style.setProperty("will-change", "auto");
        });
        // A few appear elements carry the low opacity via a class/appear-id
        // rather than inline — catch those by computed style.
        doc.querySelectorAll<HTMLElement>("[data-framer-appear-id]").forEach((el) => {
          if (parseFloat(doc.defaultView!.getComputedStyle(el).opacity) < 0.5)
            el.style.setProperty("opacity", "1", "important");
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

      // Scroll-linked reveals recompute their hidden state on resize, so the
      // live runtime re-hides them right after we change the artboard height.
      // A guarded, throttled observer re-reveals; our own writes are ignored
      // via the flag, and a round cap prevents any runaway fight.
      let revealing = false;
      let revealRounds = 0;
      let revealTimer: ReturnType<typeof setTimeout> | null = null;
      const reObserver = new MutationObserver((muts) => {
        if (revealing || revealRounds > 60 || revealTimer) return;
        let needs = false;
        for (const m of muts) {
          const el = m.target as HTMLElement;
          if (el.nodeType === 1 && el.style && el.style.opacity && parseFloat(el.style.opacity) < 0.5) {
            needs = true;
            break;
          }
        }
        if (!needs) return;
        revealTimer = setTimeout(() => {
          revealTimer = null;
          revealing = true;
          revealRounds++;
          try {
            revealAppear();
          } catch {
            /* ignore */
          } finally {
            revealing = false;
          }
        }, 200);
      });
      reObserver.observe(doc.documentElement, {
        attributes: true,
        attributeFilter: ["style"],
        subtree: true,
      });
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
    setPagePath((p) => bumpRefresh(p));
  }

  function toggleBp(bp: string) {
    setVisibleBps((prev) => {
      const next = new Set(prev);
      if (next.has(bp)) {
        if (next.size === 1) return prev; // always keep one artboard visible
        next.delete(bp);
      } else {
        next.add(bp);
      }
      return next;
    });
  }

  const visFrames = FRAMES.filter((f) => visibleBps.has(f.bp));
  const rowW = visFrames.reduce((s, f) => s + f.w, 0) + GAP * Math.max(0, visFrames.length - 1);
  const rowH = Math.max(...FRAMES.map((f, i) => (visibleBps.has(f.bp) ? heights[i] : 0))) + LABEL_H;
  const activeHint = TOOLS.find((t) => t.id === tool)?.hint || "";

  /** Zoom so the visible artboards fit the canvas width. */
  const fitZoom = useCallback(() => {
    const el = canvasRef.current;
    if (!el || rowW === 0) return;
    const avail = el.clientWidth - 128; // canvas padding
    setZoom(Math.min(1, Math.max(0.1, +(avail / rowW).toFixed(2))));
  }, [rowW]);

  // Ctrl/Cmd + scroll zooms the canvas, like every design tool.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(1, Math.max(0.1, +(z - Math.sign(e.deltaY) * 0.05).toFixed(2))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Keyboard shortcuts: T/L/I/P switch tools, +/− zoom, 0 fits to width.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialog || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "t") setTool("text");
      else if (k === "l") setTool("link");
      else if (k === "i") setTool("image");
      else if (k === "p") setTool("preview");
      else if (k === "=" || k === "+") setZoom((z) => Math.min(1, +(z + 0.05).toFixed(2)));
      else if (k === "-") setZoom((z) => Math.max(0.1, +(z - 0.05).toFixed(2)));
      else if (k === "0") fitZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, fitZoom]);

  /** Read-only structural summary of the live page — nav links, heading
   *  outline, images — built from whichever artboard is currently visible.
   *  Mirrors the orientation comment extracted for generated route.ts files
   *  (lib/nextjs-export.ts), applied here to the live iframe DOM instead so
   *  rows can jump-scroll to the real element on the canvas. */
  const buildLayerTree = useCallback(() => {
    const idx = FRAMES.findIndex((f) => visibleBps.has(f.bp));
    const doc = frameRefs.current[idx < 0 ? 0 : idx]?.contentDocument;
    if (!doc || !doc.body) return;

    const nav: LayerRow[] = [];
    const seenHrefs = new Set<string>();
    doc.querySelectorAll<HTMLAnchorElement>("nav a[href], header a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const text = norm(a.textContent || "");
      if (!href || !text || seenHrefs.has(href) || nav.length >= 15) return;
      seenHrefs.add(href);
      nav.push({ icon: "link", label: text, el: a });
    });

    const headings: LayerRow[] = [];
    doc.querySelectorAll<HTMLElement>("h1, h2, h3").forEach((el) => {
      const text = norm(el.textContent || "");
      if (!text || headings.length >= 30) return;
      headings.push({ icon: "heading", label: text, sub: el.tagName.toLowerCase(), el });
    });

    const images: LayerRow[] = [];
    doc.querySelectorAll<HTMLImageElement>("img").forEach((el) => {
      if (images.length >= 20) return;
      const alt = norm(el.getAttribute("alt") || "");
      const name = (el.getAttribute("src") || "").split("/").pop()?.slice(0, 30) || "image";
      images.push({ icon: "image", label: alt || name, sub: alt ? name : undefined, el });
    });

    setLayerTree({ nav, headings, images });
  }, [visibleBps]);

  useEffect(() => {
    if (leftTab === "layers") buildLayerTree();
  }, [leftTab, pagePath, buildLayerTree]);

  /** Scroll the canvas so a live element (found via the layer tree) centers
   *  in view, and flash an outline on it. The iframe never scrolls
   *  internally (artboards render full-height, see wireFrame), so this
   *  computes the element's painted position via getBoundingClientRect and
   *  scrolls the outer canvas container instead. */
  const jumpTo = useCallback((el: HTMLElement) => {
    try {
      const iframe = el.ownerDocument?.defaultView?.frameElement as HTMLIFrameElement | null;
      const canvas = canvasRef.current;
      if (!iframe || !canvas) return;
      const iframeRect = iframe.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const scale = iframeRect.height / (iframe.offsetHeight || 1);
      const targetViewportY = iframeRect.top + elRect.top * scale;
      const canvasRect = canvas.getBoundingClientRect();
      const delta = targetViewportY - canvasRect.top - canvasRect.height / 2 + (elRect.height * scale) / 2;
      canvas.scrollBy({ top: delta, left: 0, behavior: "smooth" });

      const prevOutline = el.style.outline;
      const prevOffset = el.style.outlineOffset;
      el.style.outline = "2.5px solid #3b82f6";
      el.style.outlineOffset = "2px";
      setTimeout(() => {
        el.style.outline = prevOutline;
        el.style.outlineOffset = prevOffset;
      }, 1200);
    } catch {
      /* element may be stale after a reload — ignore */
    }
  }, []);

  return (
    <div className="flex h-screen flex-col bg-[#111113] text-neutral-200">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#26262b] bg-[#161618] px-3 text-[13px]">
        <Link
          href="/dashboard"
          title="Back to dashboard"
          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-[#26262b] hover:text-white"
        >
          <Icon name="back" size={15} />
        </Link>
        <div className="mx-auto flex min-w-0 items-center gap-2 text-[12.5px]">
          <span className="truncate font-medium text-neutral-100">{siteName}</span>
          <span className="text-neutral-600">/</span>
          <span className="truncate text-neutral-400">
            {pageLabel(pages.find((p) => p.path === pagePath)?.route || "/")}
          </span>
        </div>
        {/* tools */}
        <div className="flex gap-0.5 rounded-lg bg-[#0e0e10] p-0.5 ring-1 ring-[#26262b]">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.hint} · ${t.key}`}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${
                tool === t.id
                  ? "bg-[#2c2c31] font-medium text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Icon name={t.id} size={13} />
              {t.label}
            </button>
          ))}
        </div>
        <span
          className={`hidden w-14 text-right text-[11px] sm:block ${
            saveState === "saving" ? "text-neutral-400" : "text-neutral-600"
          }`}
        >
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
        </span>
        <button
          onClick={publish}
          disabled={publishing || edits.length === 0 || !canPublish}
          title={!canPublish ? "Deploy this site once with “Save deploy for live editing” checked." : ""}
          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_4px_12px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {publishing ? "Publishing…" : edits.length > 0 ? `Publish ${edits.length}` : "Publish"}
        </button>
      </header>

      {publishMsg && (
        <div
          className={`flex items-center gap-2 border-b px-4 py-1.5 text-[12px] ${
            publishMsg.ok
              ? "border-emerald-900/50 bg-emerald-950/50 text-emerald-300"
              : "border-red-900/50 bg-red-950/50 text-red-300"
          }`}
        >
          <Icon name={publishMsg.ok ? "check" : "alert"} size={13} />
          {publishMsg.text}
          {publishMsg.url && (
            <a href={publishMsg.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {publishMsg.url}
            </a>
          )}
          <button
            onClick={() => setPublishMsg(null)}
            className="ml-auto rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
            aria-label="Dismiss"
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-[#26262b] bg-[#161618]">
          <div className="flex gap-1 border-b border-[#26262b] p-1.5 text-[12px]">
            {(["pages", "layers", "assets"] as LeftTab[]).map((tb) => (
              <button
                key={tb}
                onClick={() => setLeftTab(tb)}
                className={`rounded-md px-2 py-1 capitalize transition-colors ${
                  leftTab === tb ? "bg-[#26262b] font-medium text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {tb}
                {tb === "pages" && <span className="ml-1 text-[10px] text-neutral-500">{pages.length}</span>}
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
                      className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                        p.path === pagePath ? "bg-[#26262b] text-white" : "text-neutral-400 hover:bg-[#1c1c1f] hover:text-neutral-200"
                      }`}
                    >
                      <Icon
                        name={p.route === "/" ? "home" : "page"}
                        size={13}
                        className={p.path === pagePath ? "text-blue-400" : "text-neutral-600 group-hover:text-neutral-400"}
                      />
                      <span className="truncate">{pageLabel(p.route)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : leftTab === "layers" ? (
              <div className="space-y-3">
                <button
                  onClick={buildLayerTree}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#26262b] px-2 py-1.5 text-[11.5px] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200"
                >
                  <Icon name="refresh" size={11} />
                  Refresh from canvas
                </button>
                {!layerTree ? (
                  <p className="px-1 py-2 leading-relaxed text-neutral-500">Loading page structure…</p>
                ) : (
                  <>
                    <LayerGroup title="Navigation" icon="nav" rows={layerTree.nav} onSelect={jumpTo} />
                    <LayerGroup title="Sections" icon="heading" rows={layerTree.headings} onSelect={jumpTo} />
                    <LayerGroup title="Images" icon="image" rows={layerTree.images} onSelect={jumpTo} />
                    {!layerTree.nav.length && !layerTree.headings.length && !layerTree.images.length && (
                      <p className="px-1 py-2 leading-relaxed text-neutral-500">Nothing detected on this page yet.</p>
                    )}
                  </>
                )}
                <p className="px-1 pt-1 text-[11px] leading-relaxed text-neutral-600">
                  Read-only structure — click a row to jump to it on the canvas. Use the Text/Link/Image tools to edit.
                </p>
              </div>
            ) : (
              <p className="px-2 py-4 leading-relaxed text-neutral-500">
                Asset management is coming soon. Swap images with the Image tool.
              </p>
            )}
          </div>
          <div className="border-t border-[#26262b] px-3 py-2 text-[10.5px] leading-relaxed text-neutral-600">
            <span className="text-neutral-500">Shortcuts</span> — T L I P tools · +/− zoom · 0 fit · Ctrl-scroll zoom
          </div>
        </aside>

        {/* Canvas */}
        <main
          ref={canvasRef}
          className="relative min-w-0 flex-1 overflow-auto bg-[#0d0d0f]"
          style={{
            backgroundImage: "radial-gradient(circle, #1f1f24 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        >
          <div className="p-16" style={{ width: rowW * zoom + 128, height: rowH * zoom + 128 }}>
            <div
              style={{ width: rowW, columnGap: GAP, transform: `scale(${zoom})`, transformOrigin: "top left" }}
              className="flex"
            >
              {FRAMES.map((f, i) => (
                <div key={f.bp} style={{ width: f.w }} className={visibleBps.has(f.bp) ? "" : "hidden"}>
                  <div className="mb-2 flex items-baseline gap-2.5 text-[15px] text-neutral-400">
                    <Icon name={BP_ICON[f.bp]} size={15} className="translate-y-[2px] text-neutral-500" />
                    <span className="font-medium text-neutral-300">{f.bp}</span>
                    <span className="text-[13px] text-neutral-600">
                      {f.w} × {Math.round(heights[i])}
                    </span>
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

          {/* zoom + breakpoints + hint bar */}
          <div className="pointer-events-none sticky bottom-0 left-0 flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-[#26262b] bg-[#161618]/95 px-1.5 py-1 text-[12px] shadow-lg backdrop-blur">
                <button
                  onClick={() => setZoom((z) => Math.max(0.1, +(z - 0.05).toFixed(2)))}
                  title="Zoom out (−)"
                  className="rounded px-1.5 py-0.5 text-neutral-300 transition-colors hover:bg-[#26262b] hover:text-white"
                >
                  −
                </button>
                <span className="w-10 text-center tabular-nums text-neutral-400">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(1, +(z + 0.05).toFixed(2)))}
                  title="Zoom in (+)"
                  className="rounded px-1.5 py-0.5 text-neutral-300 transition-colors hover:bg-[#26262b] hover:text-white"
                >
                  +
                </button>
                <button
                  onClick={fitZoom}
                  title="Fit to width (0)"
                  className="ml-0.5 rounded px-1.5 py-0.5 text-neutral-500 transition-colors hover:bg-[#26262b] hover:text-neutral-200"
                >
                  Fit
                </button>
              </div>
              <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-[#26262b] bg-[#161618]/95 p-1 shadow-lg backdrop-blur">
                {FRAMES.map((f) => (
                  <button
                    key={f.bp}
                    onClick={() => toggleBp(f.bp)}
                    title={`${visibleBps.has(f.bp) ? "Hide" : "Show"} ${f.bp} (${f.w}px)`}
                    className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors ${
                      visibleBps.has(f.bp)
                        ? "bg-[#2c2c31] text-neutral-200"
                        : "text-neutral-600 hover:text-neutral-400"
                    }`}
                  >
                    <Icon name={BP_ICON[f.bp]} size={13} />
                  </button>
                ))}
              </div>
            </div>
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[#26262b] bg-[#161618]/95 px-3 py-1.5 text-[12px] text-neutral-400 shadow-lg backdrop-blur">
              <Icon name={tool} size={12} className="text-neutral-500" />
              {activeHint}
            </div>
          </div>
        </main>

        {/* Right panel — an inline Inspector replaces the Changes list while
            editing a link/image (Framer's canvas uses a persistent side
            panel for this, never a modal popup over the canvas). */}
        <aside className="flex w-64 shrink-0 flex-col border-l border-[#26262b] bg-[#161618]">
          {dialog ? (
            <>
              <div className="flex items-center gap-2 border-b border-[#26262b] px-3 py-2 text-[12.5px]">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                    dialog.kind === "link" ? "bg-violet-500/15 text-violet-400" : "bg-emerald-500/15 text-emerald-400"
                  }`}
                >
                  <Icon name={dialog.kind} size={11} />
                </span>
                <span className="font-medium text-white">{dialog.kind === "link" ? "Editing link" : "Editing image"}</span>
                <button
                  onClick={() => setDialog(null)}
                  className="ml-auto rounded p-0.5 text-neutral-500 transition-colors hover:bg-[#26262b] hover:text-neutral-200"
                  aria-label="Close"
                >
                  <Icon name="x" size={12} />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-3 text-[12px]">
                {dialog.kind === "link" ? (
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">Link to</div>
                    <input
                      autoFocus
                      value={dialog.value}
                      onChange={(e) => setDialog((d) => (d ? { ...d, value: e.target.value } : d))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyDialog();
                        if (e.key === "Escape") setDialog(null);
                      }}
                      placeholder="https://… or /path"
                      className="mt-1.5 h-9 w-full rounded-lg border border-[#2a2a2e] bg-[#0e0e10] px-3 text-[13px] text-neutral-100 outline-none focus:border-blue-500"
                    />
                    <p className="mt-2 leading-relaxed text-neutral-500">A full URL, or a path like /contact.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">Source</div>
                      <label
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const f = e.dataTransfer.files?.[0];
                          if (f) void handleDialogFile(f);
                        }}
                        className={`mt-1.5 flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-3 text-center text-[12px] transition-colors ${
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
                            <span className="font-medium text-neutral-300">Drop image or click</span>
                            <span className="text-[11px] text-neutral-500">up to 8 MB</span>
                          </>
                        )}
                      </label>
                    </div>
                    {dialog.value && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dialog.value} alt="" className="max-h-28 w-full rounded border border-[#26262b] object-contain" />
                    )}
                    <div>
                      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">Image URL</div>
                      <input
                        value={dialog.value}
                        onChange={(e) => setDialog((d) => (d ? { ...d, value: e.target.value } : d))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") applyDialog();
                          if (e.key === "Escape") setDialog(null);
                        }}
                        placeholder="https://…/image.jpg"
                        className="mt-1.5 h-9 w-full rounded-lg border border-[#2a2a2e] bg-[#0e0e10] px-3 text-[13px] text-neutral-100 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t border-[#26262b] p-2">
                <button
                  onClick={() => setDialog(null)}
                  className="flex-1 rounded-lg border border-[#2a2a2e] px-3 py-1.5 text-[13px] text-neutral-300 transition-colors hover:border-neutral-600"
                >
                  Cancel
                </button>
                <button
                  onClick={applyDialog}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-500"
                >
                  Apply
                </button>
              </div>
            </>
          ) : (
            <>
          <div className="flex items-center justify-between border-b border-[#26262b] px-3 py-2 text-[12.5px]">
            <span className="font-medium text-white">Changes</span>
            {edits.length > 0 && (
              <span className="rounded-full bg-[#26262b] px-1.5 py-0.5 text-[10.5px] tabular-nums text-neutral-400">
                {edits.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-2 text-[12px]">
            {edits.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                <Icon name="sparkle" size={18} className="text-neutral-600" />
                <p className="text-neutral-500">No changes yet.</p>
                <p className="text-[11.5px] leading-relaxed text-neutral-600">
                  Pick a tool and click on the canvas — text to rewrite it, a link to repoint it, an image
                  to swap it. Every change lands here before you publish.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {edits.map((e, i) => (
                  <li key={i} className="group flex items-start gap-2 rounded-md bg-[#1c1c1f] px-2 py-2">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                        e.kind === "text"
                          ? "bg-sky-500/15 text-sky-400"
                          : e.kind === "link"
                            ? "bg-violet-500/15 text-violet-400"
                            : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      <Icon name={e.kind} size={11} />
                    </span>
                    <div className="min-w-0 flex-1">
                      {e.kind === "text" ? (
                        <>
                          <div className="truncate text-neutral-500 line-through">{e.oldText}</div>
                          <div className="truncate text-neutral-200">{e.newText}</div>
                        </>
                      ) : e.kind === "link" ? (
                        <>
                          <div className="truncate text-neutral-500 line-through">{e.oldHref}</div>
                          <div className="truncate text-neutral-200">{e.newHref}</div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={e.newSrc}
                            alt=""
                            className="h-8 w-12 shrink-0 rounded border border-[#26262b] object-cover"
                          />
                          <span className="text-neutral-300">Image replaced</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeEdit(i)}
                      title="Undo this change"
                      className="mt-0.5 rounded p-0.5 text-neutral-600 opacity-0 transition-all hover:bg-[#26262b] hover:text-neutral-300 group-hover:opacity-100"
                    >
                      <Icon name="x" size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-[#26262b] p-2">
            {edits.length > 0 && (
              <button
                onClick={discardAll}
                className="w-full rounded-md border border-[#26262b] px-3 py-1.5 text-[12px] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200"
              >
                Discard all changes
              </button>
            )}
            {!canPublish && (
              <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-amber-400/90">
                <Icon name="alert" size={12} className="mt-0.5 shrink-0" />
                Deploy this site once with “Save deploy for live editing” checked to enable Publish.
              </p>
            )}
          </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
