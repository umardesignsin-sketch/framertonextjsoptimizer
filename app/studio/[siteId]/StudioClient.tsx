"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BREAKPOINTS,
  type Breakpoint,
  type DesignDoc,
  type DesignNode,
  type NodeType,
  type StyleProps,
  findNode,
  nodeLabel,
  resolveStyles,
  isOverridden,
  toCss,
} from "@/lib/design/types";
import {
  addNode,
  deleteNode,
  moveNode,
  setNodeStyle,
  updateNodeField,
  updateNodeText,
} from "./nodeUpdate";

type Mode = "canvas" | "preview";

// ---------- Canvas node renderer ----------
function NodeView({
  node,
  bp,
  mode,
  selectedId,
  editingId,
  onSelect,
  onStartEditText,
  onCommitText,
}: {
  node: DesignNode;
  bp: Breakpoint;
  mode: Mode;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string, additive: boolean, e: React.MouseEvent) => void;
  onStartEditText: (id: string) => void;
  onCommitText: (id: string, text: string) => void;
}) {
  const css = toCss(resolveStyles(node, bp));
  const selected = mode === "canvas" && selectedId === node.id;
  const editing = mode === "canvas" && editingId === node.id;

  const selStyle: React.CSSProperties = selected
    ? { outline: "2px solid #2563eb", outlineOffset: 1 }
    : {};

  const common = {
    className: mode === "canvas" ? "studio-node" : undefined,
    style: { ...css, ...selStyle },
    onClick:
      mode === "canvas"
        ? (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelect(node.id, e.shiftKey, e);
          }
        : undefined,
  };

  const editableText = (tag: "h2" | "p" | "span") => {
    const Tag: React.ElementType = tag;
    if (editing) {
      return (
        <Tag
          {...common}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e: React.FocusEvent<HTMLElement>) => onCommitText(node.id, e.currentTarget.innerText)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget as HTMLElement).blur();
            }
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{ ...common.style, outline: "2px solid #2563eb", cursor: "text" }}
        >
          {node.text}
        </Tag>
      );
    }
    return (
      <Tag
        {...common}
        onDoubleClick={
          mode === "canvas"
            ? (e: React.MouseEvent) => {
                e.stopPropagation();
                onStartEditText(node.id);
              }
            : undefined
        }
      >
        {node.text}
      </Tag>
    );
  };

  switch (node.type) {
    case "page":
    case "section":
      return (
        <div {...common}>
          {(node.children || []).map((c) => (
            <NodeView
              key={c.id}
              node={c}
              bp={bp}
              mode={mode}
              selectedId={selectedId}
              editingId={editingId}
              onSelect={onSelect}
              onStartEditText={onStartEditText}
              onCommitText={onCommitText}
            />
          ))}
          {node.type === "section" && (node.children || []).length === 0 && mode === "canvas" && (
            <span style={{ color: "#9ca3af", fontSize: 13 }}>Empty section — add blocks from the toolbar</span>
          )}
        </div>
      );
    case "heading":
      return editableText("h2");
    case "text":
      return editableText("p");
    case "button":
      if (mode === "preview")
        return (
          <a href={node.href || "#"} style={{ ...css, display: "inline-block", textDecoration: "none" }}>
            {node.text}
          </a>
        );
      return editableText("span");
    case "image":
      if (node.src)
        // eslint-disable-next-line @next/next/no-img-element
        return <img {...common} src={node.src} alt={node.alt || ""} />;
      return (
        <div
          {...common}
          style={{
            ...common.style,
            background: "#eef0f2",
            color: "#9ca3af",
            minHeight: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          Image — set a URL in Properties
        </div>
      );
    default:
      return null;
  }
}

// ---------- Layer tree (left panel) ----------
function LayerRow({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: DesignNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[12.5px] ${
          selectedId === node.id ? "bg-[#2a2a2e] text-white" : "text-neutral-300 hover:bg-[#1e1e21]"
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <span className="text-neutral-500">
          {node.type === "section" ? "▢" : node.type === "image" ? "🖼" : node.type === "button" ? "⬚" : node.type === "page" ? "⌂" : "T"}
        </span>
        <span className="truncate">{nodeLabel(node)}</span>
      </button>
      {(node.children || []).map((c) => (
        <LayerRow key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ---------- Small property inputs ----------
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="w-24 shrink-0 text-[11.5px] text-neutral-400">{label}</span>
      <div className="flex flex-1 items-center gap-1">{children}</div>
    </div>
  );
}
function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      placeholder={placeholder || "—"}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      className="h-7 w-full rounded border border-[#2a2a2e] bg-[#0e0e10] px-2 text-[12px] text-neutral-100 outline-none focus:border-blue-500"
    />
  );
}
function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full rounded border border-[#2a2a2e] bg-[#0e0e10] px-2 text-[12px] text-neutral-100 outline-none focus:border-blue-500"
    />
  );
}
function ColorInput({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <div className="flex flex-1 items-center gap-1">
      <input
        type="color"
        value={value && /^#/.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 shrink-0 cursor-pointer rounded border border-[#2a2a2e] bg-transparent"
      />
      <input
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => onChange(e.target.value || undefined)}
        className="h-7 w-full rounded border border-[#2a2a2e] bg-[#0e0e10] px-2 text-[12px] text-neutral-100 outline-none focus:border-blue-500"
      />
    </div>
  );
}
function SelectInput<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: readonly T[];
  onChange: (v: T | undefined) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      className="h-7 w-full rounded border border-[#2a2a2e] bg-[#0e0e10] px-1 text-[12px] text-neutral-100 outline-none focus:border-blue-500"
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function StudioClient({
  siteId,
  siteName,
  initialDoc,
}: {
  siteId: string;
  siteName: string;
  initialDoc: DesignDoc;
}) {
  const [doc, setDoc] = useState<DesignDoc>(initialDoc);
  const [pageId] = useState(initialDoc.pages[0]?.id || "home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeBp, setActiveBp] = useState<Breakpoint>("desktop");
  const [mode, setMode] = useState<Mode>("canvas");
  const [leftTab, setLeftTab] = useState<"pages" | "layers" | "assets">("layers");
  const [zoom, setZoom] = useState(0.55);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const page = doc.pages.find((p) => p.id === pageId) || doc.pages[0];
  const selected = selectedId ? findNode(page.root, selectedId) : null;

  // autosave (debounced)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(
    (next: DesignDoc) => {
      if (timer.current) clearTimeout(timer.current);
      setSaveState("saving");
      timer.current = setTimeout(async () => {
        try {
          await fetch(`/api/design/${siteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doc: next }),
          });
          setSaveState("saved");
        } catch {
          setSaveState("idle");
        }
      }, 600);
    },
    [siteId]
  );
  const commit = useCallback(
    (next: DesignDoc) => {
      setDoc(next);
      scheduleSave(next);
    },
    [scheduleSave]
  );

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    setEditingId(null);
  }, []);

  const setStyle = useCallback(
    (key: keyof StyleProps, value: StyleProps[keyof StyleProps] | undefined) => {
      if (!selectedId) return;
      commit(setNodeStyle(doc, pageId, selectedId, activeBp, key, value));
    },
    [doc, pageId, selectedId, activeBp, commit]
  );

  const addBlock = useCallback(
    (type: NodeType) => {
      const parent = selectedId || page.root.id;
      const { doc: next, newId } = addNode(doc, pageId, parent, type);
      commit(next);
      setSelectedId(newId);
    },
    [doc, pageId, selectedId, page.root.id, commit]
  );

  // keyboard: delete selected
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      const t = e.target as HTMLElement;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && selectedId !== page.root.id) {
        e.preventDefault();
        commit(deleteNode(doc, pageId, selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingId, doc, pageId, page.root.id, commit]);

  const rowW = useMemo(() => BREAKPOINTS.reduce((s, b) => s + b.width, 0) + 80 * (BREAKPOINTS.length - 1), []);

  const isText = selected && (selected.type === "heading" || selected.type === "text" || selected.type === "button");

  return (
    <div className="flex h-screen flex-col bg-[#111113] text-neutral-200">
      <style>{`.studio-node{cursor:default}.studio-node:hover{outline:1px dashed rgba(37,99,235,.55);outline-offset:1px}`}</style>

      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#2a2a2e] bg-[#161618] px-3 text-[13px]">
        <Link href="/dashboard" className="flex h-6 w-6 items-center justify-center rounded bg-[#2a2a2e] font-bold hover:bg-[#333]">
          ←
        </Link>
        <span className="text-[12.5px] font-medium">{siteName}</span>
        <span className="rounded bg-[#2a2a2e] px-2 py-0.5 text-[11px] text-neutral-400">Studio</span>

        {/* breakpoint being edited */}
        <div className="ml-2 flex gap-0.5 rounded-md bg-[#0e0e10] p-0.5">
          {BREAKPOINTS.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBp(b.id)}
              className={`rounded px-2.5 py-1 text-[12px] ${activeBp === b.id ? "bg-[#2a2a2e] font-medium text-white" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="mx-auto flex gap-0.5 rounded-md bg-[#0e0e10] p-0.5">
          {(["canvas", "preview"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setEditingId(null);
              }}
              className={`rounded px-3 py-1 text-[12px] capitalize ${mode === m ? "bg-[#2a2a2e] font-medium text-white" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              {m === "canvas" ? "Canvas" : "Preview"}
            </button>
          ))}
        </div>

        <span className="text-[11.5px] text-neutral-500">
          {saveState === "saving" ? "saving…" : saveState === "saved" ? "saved" : ""}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-[#2a2a2e] bg-[#161618]">
          <div className="flex gap-4 border-b border-[#2a2a2e] px-3 py-2 text-[12.5px]">
            {(["pages", "layers", "assets"] as const).map((tb) => (
              <button
                key={tb}
                onClick={() => setLeftTab(tb)}
                className={`capitalize ${leftTab === tb ? "font-medium text-white" : "text-neutral-500 hover:text-neutral-300"}`}
              >
                {tb}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-2">
            {leftTab === "layers" ? (
              <LayerRow node={page.root} depth={0} selectedId={selectedId} onSelect={onSelect} />
            ) : leftTab === "pages" ? (
              <ul className="space-y-0.5 text-[12.5px]">
                {doc.pages.map((p) => (
                  <li key={p.id} className="rounded bg-[#2a2a2e] px-2 py-1.5 text-white">
                    ⌂ {p.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 py-3 text-[12px] text-neutral-500">
                Assets library is coming soon. Swap image blocks by URL in Properties.
              </p>
            )}
          </div>
          {/* add-block toolbar */}
          <div className="border-t border-[#2a2a2e] p-2">
            <p className="mb-1 px-1 text-[11px] text-neutral-500">Add block{selected ? " into " + nodeLabel(selected).slice(0, 14) : ""}</p>
            <div className="grid grid-cols-3 gap-1">
              {(["section", "heading", "text", "button", "image"] as NodeType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => addBlock(t)}
                  className="rounded border border-[#2a2a2e] px-1 py-1 text-[11px] capitalize text-neutral-300 hover:border-neutral-500"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main
          className="relative min-w-0 flex-1 overflow-auto bg-[#0d0d0f]"
          onClick={() => {
            setSelectedId(null);
            setEditingId(null);
          }}
        >
          {mode === "canvas" ? (
            <div className="p-16" style={{ width: rowW * zoom + 128 }}>
              <div style={{ width: rowW, transform: `scale(${zoom})`, transformOrigin: "top left" }} className="flex gap-20">
                {BREAKPOINTS.map((b) => (
                  <div key={b.id} style={{ width: b.width }} onClick={(e) => e.stopPropagation()}>
                    <div className="mb-2 flex items-center gap-2 text-[15px]">
                      <span className={`font-medium ${activeBp === b.id ? "text-blue-400" : "text-neutral-300"}`}>{b.label}</span>
                      <span className="text-neutral-600">{b.width}</span>
                    </div>
                    <div className="overflow-hidden rounded-md bg-white shadow-2xl ring-1 ring-black/40" style={{ width: b.width }}>
                      <NodeView
                        node={page.root}
                        bp={b.id}
                        mode="canvas"
                        selectedId={selectedId}
                        editingId={editingId}
                        onSelect={onSelect}
                        onStartEditText={(id) => {
                          setSelectedId(id);
                          setEditingId(id);
                        }}
                        onCommitText={(id, text) => {
                          commit(updateNodeText(doc, pageId, id, text));
                          setEditingId(null);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Preview mode — the real website at the active breakpoint.
            <div className="flex justify-center p-8" onClick={(e) => e.stopPropagation()}>
              <div
                className="overflow-hidden rounded-md bg-white shadow-2xl"
                style={{ width: BREAKPOINTS.find((b) => b.id === activeBp)!.width, maxWidth: "100%" }}
              >
                <NodeView
                  node={page.root}
                  bp={activeBp}
                  mode="preview"
                  selectedId={null}
                  editingId={null}
                  onSelect={() => {}}
                  onStartEditText={() => {}}
                  onCommitText={() => {}}
                />
              </div>
            </div>
          )}

          {mode === "canvas" && (
            <div className="pointer-events-none sticky bottom-0 left-0 flex px-4 py-2">
              <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#161618]/95 px-2 py-1 text-[12px]">
                <button onClick={() => setZoom((z) => Math.max(0.15, +(z - 0.05).toFixed(2)))} className="px-1 hover:text-white">−</button>
                <span className="w-9 text-center text-neutral-400">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(1, +(z + 0.05).toFixed(2)))} className="px-1 hover:text-white">+</button>
              </div>
            </div>
          )}
        </main>

        {/* Right panel — Properties */}
        <aside className="flex w-64 shrink-0 flex-col border-l border-[#2a2a2e] bg-[#161618]">
          <div className="flex items-center justify-between border-b border-[#2a2a2e] px-3 py-2 text-[12.5px]">
            <span className="font-medium text-white">{selected ? nodeLabel(selected) : "Properties"}</span>
            {selected && selectedId !== page.root.id && (
              <div className="flex gap-1 text-neutral-400">
                <button title="Move up" onClick={() => commit(moveNode(doc, pageId, selected.id, -1))} className="hover:text-white">↑</button>
                <button title="Move down" onClick={() => commit(moveNode(doc, pageId, selected.id, 1))} className="hover:text-white">↓</button>
                <button
                  title="Delete"
                  onClick={() => {
                    commit(deleteNode(doc, pageId, selected.id));
                    setSelectedId(null);
                  }}
                  className="hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {!selected ? (
            <p className="p-3 text-[12px] text-neutral-500">Select a block on the canvas to edit its properties.</p>
          ) : (
            <div className="flex-1 overflow-auto px-3 py-2 text-[12px]">
              <p className="mb-2 rounded bg-[#0e0e10] px-2 py-1 text-[11px] text-neutral-400">
                Editing <span className="text-blue-400">{BREAKPOINTS.find((b) => b.id === activeBp)!.label}</span>
                {activeBp !== "desktop" && " — only overrides are stored"}
              </p>

              <PropsPanel
                node={selected}
                bp={activeBp}
                isText={!!isText}
                setStyle={setStyle}
                onField={(f, v) => commit(updateNodeField(doc, pageId, selected.id, f, v))}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ---------- Properties panel ----------
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 border-t border-[#232326] pt-2 first:border-t-0 first:pt-0">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">{title}</p>
      {children}
    </div>
  );
}
function OverrideDot({ on }: { on: boolean }) {
  return <span title={on ? "Overridden here" : "Inherited"} className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? "bg-blue-500" : "bg-transparent"}`} />;
}

function PropsPanel({
  node,
  bp,
  isText,
  setStyle,
  onField,
}: {
  node: DesignNode;
  bp: Breakpoint;
  isText: boolean;
  setStyle: (k: keyof StyleProps, v: StyleProps[keyof StyleProps] | undefined) => void;
  onField: (f: "href" | "src" | "alt" | "name", v: string) => void;
}) {
  const r = resolveStyles(node, bp);
  const ov = (k: keyof StyleProps) => isOverridden(node, bp, k);

  return (
    <>
      <Group title="Content">
        {node.type === "image" ? (
          <>
            <Row label="Image URL">
              <TextInput value={node.src} onChange={(v) => onField("src", v)} placeholder="https://…" />
            </Row>
            <Row label="Alt text">
              <TextInput value={node.alt} onChange={(v) => onField("alt", v)} />
            </Row>
          </>
        ) : node.type === "section" || node.type === "page" ? (
          <Row label="Name">
            <TextInput value={node.name} onChange={(v) => onField("name", v)} />
          </Row>
        ) : (
          <p className="text-[11.5px] text-neutral-500">Double-click the block on the canvas to edit its text.</p>
        )}
        {node.type === "button" && (
          <Row label="Link">
            <TextInput value={node.href} onChange={(v) => onField("href", v)} placeholder="/ or https://…" />
          </Row>
        )}
      </Group>

      {isText && (
        <Group title="Typography">
          <Row label="Size">
            <OverrideDot on={ov("fontSize")} />
            <NumberInput value={r.fontSize} onChange={(v) => setStyle("fontSize", v)} />
          </Row>
          <Row label="Weight">
            <OverrideDot on={ov("fontWeight")} />
            <SelectInput value={r.fontWeight as unknown as string} options={["400", "500", "600", "700", "800"]} onChange={(v) => setStyle("fontWeight", v ? Number(v) : undefined)} />
          </Row>
          <Row label="Line height">
            <OverrideDot on={ov("lineHeight")} />
            <NumberInput value={r.lineHeight} onChange={(v) => setStyle("lineHeight", v)} placeholder="1.5" />
          </Row>
          <Row label="Align">
            <OverrideDot on={ov("textAlign")} />
            <SelectInput value={r.textAlign} options={["left", "center", "right"] as const} onChange={(v) => setStyle("textAlign", v)} />
          </Row>
          <Row label="Color">
            <OverrideDot on={ov("color")} />
            <ColorInput value={r.color} onChange={(v) => setStyle("color", v)} />
          </Row>
        </Group>
      )}

      <Group title="Layout">
        <Row label="Display">
          <OverrideDot on={ov("display")} />
          <SelectInput value={r.display} options={["block", "flex"] as const} onChange={(v) => setStyle("display", v)} />
        </Row>
        {r.display === "flex" && (
          <>
            <Row label="Direction">
              <OverrideDot on={ov("flexDirection")} />
              <SelectInput value={r.flexDirection} options={["row", "column"] as const} onChange={(v) => setStyle("flexDirection", v)} />
            </Row>
            <Row label="Align">
              <OverrideDot on={ov("alignItems")} />
              <SelectInput value={r.alignItems} options={["flex-start", "center", "flex-end", "stretch"] as const} onChange={(v) => setStyle("alignItems", v)} />
            </Row>
            <Row label="Justify">
              <OverrideDot on={ov("justifyContent")} />
              <SelectInput value={r.justifyContent} options={["flex-start", "center", "flex-end", "space-between"] as const} onChange={(v) => setStyle("justifyContent", v)} />
            </Row>
            <Row label="Gap">
              <OverrideDot on={ov("gap")} />
              <NumberInput value={r.gap} onChange={(v) => setStyle("gap", v)} />
            </Row>
          </>
        )}
        <Row label="Width">
          <OverrideDot on={ov("width")} />
          <TextInput value={r.width} onChange={(v) => setStyle("width", v || undefined)} placeholder="auto / 100% / 480px" />
        </Row>
        <Row label="Max width">
          <OverrideDot on={ov("maxWidth")} />
          <NumberInput value={r.maxWidth} onChange={(v) => setStyle("maxWidth", v)} />
        </Row>
        <Row label="Min height">
          <OverrideDot on={ov("minHeight")} />
          <NumberInput value={r.minHeight} onChange={(v) => setStyle("minHeight", v)} />
        </Row>
      </Group>

      <Group title="Spacing">
        <Row label="Padding X">
          <OverrideDot on={ov("paddingX")} />
          <NumberInput value={r.paddingX} onChange={(v) => setStyle("paddingX", v)} />
        </Row>
        <Row label="Padding Y">
          <OverrideDot on={ov("paddingY")} />
          <NumberInput value={r.paddingY} onChange={(v) => setStyle("paddingY", v)} />
        </Row>
        <Row label="Margin top">
          <OverrideDot on={ov("marginTop")} />
          <NumberInput value={r.marginTop} onChange={(v) => setStyle("marginTop", v)} />
        </Row>
        <Row label="Margin btm">
          <OverrideDot on={ov("marginBottom")} />
          <NumberInput value={r.marginBottom} onChange={(v) => setStyle("marginBottom", v)} />
        </Row>
      </Group>

      <Group title="Appearance & Effects">
        <Row label="Background">
          <OverrideDot on={ov("background")} />
          <ColorInput value={r.background} onChange={(v) => setStyle("background", v)} />
        </Row>
        <Row label="Radius">
          <OverrideDot on={ov("borderRadius")} />
          <NumberInput value={r.borderRadius} onChange={(v) => setStyle("borderRadius", v)} />
        </Row>
        <Row label="Border">
          <OverrideDot on={ov("borderWidth")} />
          <NumberInput value={r.borderWidth} onChange={(v) => setStyle("borderWidth", v)} placeholder="0" />
        </Row>
        <Row label="Opacity">
          <OverrideDot on={ov("opacity")} />
          <NumberInput value={r.opacity} onChange={(v) => setStyle("opacity", v)} placeholder="1" />
        </Row>
        <Row label="Shadow">
          <OverrideDot on={ov("shadow")} />
          <SelectInput value={r.shadow} options={["none", "sm", "md", "lg"] as const} onChange={(v) => setStyle("shadow", v)} />
        </Row>
      </Group>
    </>
  );
}
