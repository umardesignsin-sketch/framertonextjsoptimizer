"use client";

import { useState } from "react";
import type { JobMeta } from "@/lib/store";

function fmtBytes(n: number): string {
  if (!n) return "—";
  if (n > 1e6) return (n / 1e6).toFixed(1) + " MB";
  if (n > 1e3) return (n / 1e3).toFixed(0) + " KB";
  return n + " B";
}
function fmtDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
}

export function AdminDashboard({ jobs, baseUrl }: { jobs: JobMeta[]; baseUrl: string }) {
  const [rows, setRows] = useState(jobs);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string>("");

  const iframeSnippet = `<iframe src="${baseUrl}/embed" width="100%" height="640" style="border:0;border-radius:12px" title="Framer → static converter" loading="lazy"></iframe>`;
  const scriptSnippet = `<div id="framer-converter"></div>\n<script src="${baseUrl}/embed.js" async></script>`;
  const speedIframeSnippet = `<iframe src="${baseUrl}/embed/speed" width="100%" height="560" style="border:0;border-radius:12px" title="PageSpeed checker" loading="lazy"></iframe>`;
  const speedScriptSnippet = `<div id="framer-speed-checker"></div>\n<script src="${baseUrl}/speed-embed.js" async></script>`;

  async function remove(id: string) {
    if (!confirm("Delete this conversion? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
      if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  function copy(label: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <button
          onClick={logout}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-[13px] hover:border-foreground"
        >
          Log out
        </button>
      </header>

      {/* Embed the converter */}
      <section className="mt-8 rounded-xl border border-border p-5">
        <h2 className="font-medium">Embed the converter</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Drop the converter onto any site. Use the iframe (simplest) or the script tag.
          Prefill a Framer URL with <code>?url=</code>.
        </p>

        {(
          [
            ["iframe", "Embed via iframe", iframeSnippet],
            ["script", "Embed via script", scriptSnippet],
          ] as const
        ).map(([key, title, snippet]) => (
          <div key={key} className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium">{title}</span>
              <button
                onClick={() => copy(key, snippet)}
                className="rounded-md border border-border-strong px-2 py-1 text-[12px] hover:border-foreground"
              >
                {copied === key ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-foreground/5 p-3 text-[12px] leading-relaxed">
              <code>{snippet}</code>
            </pre>
          </div>
        ))}
        <a
          href="/embed"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[13px] underline"
        >
          Open the embeddable widget ↗
        </a>
      </section>

      {/* Embed the PageSpeed checker */}
      <section className="mt-8 rounded-xl border border-border p-5">
        <h2 className="font-medium">Embed the PageSpeed checker</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          A before/after Lighthouse comparison (desktop + mobile). Prefill sites with{" "}
          <code>?original=</code> and <code>?converted=</code> (iframe) or{" "}
          <code>data-original</code> / <code>data-converted</code> (script).
        </p>
        {(
          [
            ["speed-iframe", "Embed via iframe", speedIframeSnippet],
            ["speed-script", "Embed via script", speedScriptSnippet],
          ] as const
        ).map(([key, title, snippet]) => (
          <div key={key} className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium">{title}</span>
              <button
                onClick={() => copy(key, snippet)}
                className="rounded-md border border-border-strong px-2 py-1 text-[12px] hover:border-foreground"
              >
                {copied === key ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-foreground/5 p-3 text-[12px] leading-relaxed">
              <code>{snippet}</code>
            </pre>
          </div>
        ))}
        <a
          href="/embed/speed"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[13px] underline"
        >
          Open the PageSpeed checker ↗
        </a>
      </section>

      {/* Conversions */}
      <section className="mt-8">
        <h2 className="font-medium">Conversions ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            No conversions yet — or persistence (Vercel Blob) isn’t configured.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-foreground/5 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Files</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((j) => (
                  <tr key={j.id}>
                    <td className="max-w-[260px] truncate px-3 py-2" title={j.sourceUrl}>
                      {j.sourceUrl}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {fmtDate(j.createdAt)}
                    </td>
                    <td className="px-3 py-2">{j.fileCount}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtBytes(j.bytes)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <a className="underline" href={`/api/preview/${j.id}/`} target="_blank" rel="noopener noreferrer">
                        Preview
                      </a>
                      <a className="ml-3 underline" href={`/api/download/${j.id}`}>
                        Download
                      </a>
                      <button
                        onClick={() => remove(j.id)}
                        disabled={busyId === j.id}
                        className="ml-3 text-red-500 underline disabled:opacity-50"
                      >
                        {busyId === j.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
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
