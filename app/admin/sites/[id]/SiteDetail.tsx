"use client";

import { useState } from "react";

interface FieldDef {
  id: string;
  name: string;
  type: string;
}
interface ItemRow {
  id: string;
  slug: string | null;
  data: Record<string, unknown>;
}
interface CollectionRow {
  id: string;
  name: string;
  fields: FieldDef[];
  items: ItemRow[];
}
interface CmsState {
  projectUrl: string;
  status: string;
  error: string | null;
  lastSyncedAt: string | null;
  collections: CollectionRow[];
}

function fmtValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") {
    const value = (v as { value?: unknown }).value;
    if (value !== undefined) return typeof value === "object" ? JSON.stringify(value) : String(value);
    return JSON.stringify(v);
  }
  return String(v);
}

function ConnectForm({ siteId, onConnected }: { siteId: string; onConnected: () => void }) {
  const [projectUrl, setProjectUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    if (!projectUrl.trim() || !apiKey.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/sites/${siteId}/cms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectUrl: projectUrl.trim(), apiKey: apiKey.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to connect");
      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border p-5">
      <h2 className="font-medium">Connect Framer CMS</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Create an API key in the Framer project&apos;s Site Settings → General, then paste both here.
        One-way import: this mirrors the CMS into our database; edits stay here and are never
        written back to Framer.
      </p>
      <div className="mt-3 space-y-2">
        <input
          value={projectUrl}
          onChange={(e) => setProjectUrl(e.target.value)}
          placeholder="https://framer.com/projects/Sites--xxxxxxxx"
          className="h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
        />
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          placeholder="Framer Server API key"
          className="h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
        />
        <button
          onClick={connect}
          disabled={busy || !projectUrl.trim() || !apiKey.trim()}
          className="h-10 rounded-lg bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Connecting & importing…" : "Connect & import"}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
    </section>
  );
}

function ItemEditor({ item, onSaved }: { item: ItemRow; onSaved: (data: Record<string, unknown>) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => JSON.stringify(item.data, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Invalid JSON");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      onSaved(parsed);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[12px] underline">
        Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-background p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[14px] font-medium">Edit item {item.slug ? `(${item.slug})` : ""}</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Raw field data (local only — not written back to Framer).
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          className="mt-2 w-full rounded-lg border border-border-strong bg-foreground/5 p-2 font-mono text-[12px]"
        />
        {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="rounded-lg border border-border-strong px-3 py-1.5 text-[13px]">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-foreground px-3 py-1.5 text-[13px] font-medium text-background disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SiteDetail({ siteId, cms: initialCms }: { siteId: string; cms: CmsState | null }) {
  const [cms, setCms] = useState(initialCms);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch(`/api/admin/sites/${siteId}`);
    const json = await res.json();
    if (res.ok && json.site?.cms) {
      setCms({
        projectUrl: json.site.cms.projectUrl,
        status: json.site.cms.status,
        error: json.site.cms.error,
        lastSyncedAt: json.site.cms.lastSyncedAt,
        collections: json.site.cms.collections.map((c: CollectionRow) => ({
          id: c.id,
          name: c.name,
          fields: c.fields,
          items: c.items,
        })),
      });
    }
  }

  async function sync() {
    setSyncing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/sites/${siteId}/cms/sync`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync failed");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (!cms) {
    return <ConnectForm siteId={siteId} onConnected={refresh} />;
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Framer CMS connection</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {cms.projectUrl} · status: {cms.status}
              {cms.lastSyncedAt ? ` · last synced ${new Date(cms.lastSyncedAt).toLocaleString()}` : ""}
            </p>
          </div>
          <button
            onClick={sync}
            disabled={syncing}
            className="h-9 shrink-0 rounded-lg border border-border-strong px-3 text-[13px] hover:border-foreground disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Re-sync"}
          </button>
        </div>
        {(cms.error || error) && <p className="mt-2 text-[13px] text-red-600">{cms.error || error}</p>}
      </section>

      {cms.collections.map((col) => (
        <section key={col.id} className="overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border bg-foreground/5 px-4 py-2.5 text-[13px] font-medium">
            {col.name} ({col.items.length} items)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  {col.fields.slice(0, 3).map((f) => (
                    <th key={f.id} className="px-3 py-2 font-medium">
                      {f.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {col.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-mono">{item.slug ?? "—"}</td>
                    {col.fields.slice(0, 3).map((f) => (
                      <td key={f.id} className="max-w-[200px] truncate px-3 py-2" title={fmtValue(item.data[f.id])}>
                        {fmtValue(item.data[f.id])}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <ItemEditor
                        item={item}
                        onSaved={(data) =>
                          setCms((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  collections: prev.collections.map((c) =>
                                    c.id !== col.id
                                      ? c
                                      : { ...c, items: c.items.map((it) => (it.id === item.id ? { ...it, data } : it)) }
                                  ),
                                }
                              : prev
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
