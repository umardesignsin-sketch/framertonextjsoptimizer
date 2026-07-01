"use client";

import { useState } from "react";
import Link from "next/link";

interface SiteRow {
  id: string;
  name: string;
  framerUrl: string;
  cmsStatus: string | null;
  collectionCount: number;
}

export function SitesList({ initialSites }: { initialSites: SiteRow[] }) {
  const [sites, setSites] = useState(initialSites);
  const [name, setName] = useState("");
  const [framerUrl, setFramerUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!name.trim() || !framerUrl.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), framerUrl: framerUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create site");
      setSites((s) => [
        { id: json.site.id, name: json.site.name, framerUrl: json.site.framerUrl, cmsStatus: null, collectionCount: 0 },
        ...s,
      ]);
      setName("");
      setFramerUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create site");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border border-border p-5">
        <h2 className="font-medium">New site</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Site name"
            className="h-10 flex-1 rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
          />
          <input
            value={framerUrl}
            onChange={(e) => setFramerUrl(e.target.value)}
            placeholder="https://your-site.framer.website"
            className="h-10 flex-[2] rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
          />
          <button
            onClick={create}
            disabled={busy || !name.trim() || !framerUrl.trim()}
            className="h-10 rounded-lg bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
        {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      </section>

      <section>
        <h2 className="font-medium">All sites ({sites.length})</h2>
        {sites.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">No sites yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-foreground/5 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Framer URL</th>
                  <th className="px-3 py-2 font-medium">CMS</th>
                  <th className="px-3 py-2 font-medium text-right">Collections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sites.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2">
                      <Link href={`/admin/sites/${s.id}`} className="font-medium underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-muted-foreground" title={s.framerUrl}>
                      {s.framerUrl}
                    </td>
                    <td className="px-3 py-2">{s.cmsStatus ?? "not connected"}</td>
                    <td className="px-3 py-2 text-right">{s.collectionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
