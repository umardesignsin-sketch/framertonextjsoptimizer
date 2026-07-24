"use client";

import { useState } from "react";
import { AdminHeader } from "./AdminHeader";
import { Icon } from "./icons";

/** One conversion row — sourced from Postgres Site rows (see admin/page.tsx). */
export interface AdminJob {
  id: string;
  sourceUrl: string;
  createdAt: number;
  outputKind: string;
  ownerEmail: string;
}

function fmtDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ModeBadge({ kind }: { kind: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        kind === "nextjs" ? "bg-violet-500/10 text-violet-600" : "bg-emerald-500/10 text-emerald-600"
      }`}
    >
      {kind}
    </span>
  );
}

function EmbedSection({
  title,
  description,
  items,
  demoHref,
  demoLabel,
  copiedKey,
  onCopy,
}: {
  title: string;
  description: React.ReactNode;
  items: { key: string; label: string; snippet: string }[];
  demoHref: string;
  demoLabel: string;
  copiedKey: string;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-background p-4 sm:p-5">
      <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>

      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.key}>
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-foreground">{item.label}</span>
              <button
                onClick={() => onCopy(item.key, item.snippet)}
                className="flex items-center gap-1.5 rounded-md border border-border-strong px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                <Icon name={copiedKey === item.key ? "check" : "copy"} size={11} />
                {copiedKey === item.key ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-muted p-3 text-[12px] leading-relaxed">
              <code>{item.snippet}</code>
            </pre>
          </div>
        ))}
      </div>

      <a
        href={demoHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover"
      >
        {demoLabel}
        <Icon name="external" size={12} />
      </a>
    </section>
  );
}

export function AdminDashboard({ jobs, baseUrl }: { jobs: AdminJob[]; baseUrl: string }) {
  const [rows, setRows] = useState(jobs);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string>("");

  const iframeSnippet = `<iframe src="${baseUrl}/embed" width="100%" height="760" style="border:0;border-radius:12px" title="Framer → static converter" loading="lazy"></iframe>`;
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

  function copy(key: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Overview</h1>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <EmbedSection
            title="Embed the converter"
            description={
              <>
                Drop the converter onto any site. Use the iframe (simplest) or the script tag. Prefill a
                Framer URL with <code className="rounded bg-muted px-1 py-0.5 text-[12px]">?url=</code>.
              </>
            }
            items={[
              { key: "iframe", label: "Embed via iframe", snippet: iframeSnippet },
              { key: "script", label: "Embed via script", snippet: scriptSnippet },
            ]}
            demoHref="/embed"
            demoLabel="Open the embeddable widget"
            copiedKey={copied}
            onCopy={copy}
          />

          <EmbedSection
            title="Embed the PageSpeed checker"
            description={
              <>
                A before/after Lighthouse comparison. Prefill sites with{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[12px]">?original=</code> /{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[12px]">?converted=</code>.
              </>
            }
            items={[
              { key: "speed-iframe", label: "Embed via iframe", snippet: speedIframeSnippet },
              { key: "speed-script", label: "Embed via script", snippet: speedScriptSnippet },
            ]}
            demoHref="/embed/speed"
            demoLabel="Open the PageSpeed checker"
            copiedKey={copied}
            onCopy={copy}
          />
        </div>

        {/* Conversions */}
        <section className="mt-6 rounded-2xl border border-border bg-background p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground">Conversions</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] font-medium text-muted-foreground">
              {rows.length}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="mt-6 py-6 text-center text-[13px] text-muted-foreground">No conversions yet.</p>
          ) : (
            <>
              {/* Card list — small screens */}
              <ul className="mt-4 space-y-2 md:hidden">
                {rows.map((j) => (
                  <li key={j.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-[13.5px] font-medium text-foreground" title={j.sourceUrl}>
                        {sourceHost(j.sourceUrl)}
                      </span>
                      <ModeBadge kind={j.outputKind} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <span className="truncate">{j.ownerEmail}</span>
                      <span>·</span>
                      <span className="shrink-0">{fmtDate(j.createdAt)}</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-3 border-t border-border pt-2.5 text-[12.5px]">
                      <a
                        className="flex items-center gap-1 font-medium text-accent"
                        href={`/api/preview/${j.id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon name="external" size={11} /> Preview
                      </a>
                      <a className="flex items-center gap-1 font-medium text-foreground" href={`/api/download/${j.id}`}>
                        <Icon name="download" size={11} /> Download
                      </a>
                      <button
                        onClick={() => remove(j.id)}
                        disabled={busyId === j.id}
                        className="ml-auto flex items-center gap-1 font-medium text-red-500 disabled:opacity-50"
                      >
                        <Icon name="trash" size={11} />
                        {busyId === j.id ? "…" : ""}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Table — md and up */}
              <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border md:block">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Mode</th>
                      <th className="px-3 py-2 font-medium">Owner</th>
                      <th className="px-3 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((j) => (
                      <tr key={j.id} className="transition-colors hover:bg-muted/30">
                        <td className="max-w-[220px] truncate px-3 py-2.5 font-medium text-foreground" title={j.sourceUrl}>
                          {sourceHost(j.sourceUrl)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{fmtDate(j.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <ModeBadge kind={j.outputKind} />
                        </td>
                        <td className="max-w-[180px] truncate whitespace-nowrap px-3 py-2.5 text-muted-foreground" title={j.ownerEmail}>
                          {j.ownerEmail}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <div className="flex items-center justify-end gap-3">
                            <a
                              className="flex items-center gap-1 text-accent hover:text-accent-hover"
                              href={`/api/preview/${j.id}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Preview"
                            >
                              <Icon name="external" size={13} />
                            </a>
                            <a
                              className="flex items-center gap-1 text-foreground hover:text-accent"
                              href={`/api/download/${j.id}`}
                              title="Download"
                            >
                              <Icon name="download" size={13} />
                            </a>
                            <button
                              onClick={() => remove(j.id)}
                              disabled={busyId === j.id}
                              title="Delete"
                              className="flex items-center gap-1 text-red-500 hover:text-red-600 disabled:opacity-50"
                            >
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
