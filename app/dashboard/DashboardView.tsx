"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface DeploymentRow {
  id: string;
  provider: string;
  status: string;
  url: string | null;
  createdAt: string;
}
interface SiteRow {
  id: string;
  name: string;
  framerUrl: string;
  outputKind: string;
  status: string;
  themeRef: string | null;
  createdAt: string;
  canAutoDeploy: boolean;
  deployments: DeploymentRow[];
}

function fmtDate(iso: string): string {
  try {
    // Fixed locale: server and client default locales can differ, which
    // causes a hydration mismatch if left unspecified.
    return new Date(iso).toLocaleString("en-US");
  } catch {
    return "—";
  }
}

function AiEditPanel({ site }: { site: SiteRow }) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{
    applied: number;
    failed: number;
    notAnalyzed: number;
    summary: string;
    deployed: boolean;
    deployedUrl?: string | null;
  } | null>(null);

  async function run() {
    if (!instruction.trim() || busy) return;
    setBusy(true);
    setLines([]);
    setError("");
    setDone(null);
    try {
      const res = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, instruction: instruction.trim() }),
      });
      if (!res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const json = await res.json();
        throw new Error(json.error || "AI edit failed");
      }
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done: eof, value } = await reader.read();
        if (eof) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          if (!part.trim()) continue;
          let evt: {
            type: string;
            msg?: string;
            message?: string;
            applied?: number;
            summary?: string;
            deployed?: boolean;
            deployedUrl?: string | null;
            failedEdits?: { file: string; reason: string }[];
            skippedFiles?: string[];
          };
          try {
            evt = JSON.parse(part);
          } catch {
            continue;
          }
          if (evt.type === "progress" && evt.msg) setLines((p) => [...p, evt.msg!]);
          else if (evt.type === "done") {
            setDone({
              applied: evt.applied || 0,
              failed: evt.failedEdits?.length || 0,
              notAnalyzed: evt.skippedFiles?.length || 0,
              summary: evt.summary || "",
              deployed: !!evt.deployed,
              deployedUrl: evt.deployedUrl,
            });
          } else if (evt.type === "error") {
            setError(evt.message || "AI edit failed");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI edit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-foreground/[0.02] p-3">
      <h3 className="text-[12px] font-medium text-muted-foreground">AI edit</h3>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        Describe a change in plain English — the AI edits the site&apos;s files
        {site.canAutoDeploy
          ? " and pushes it to your live deployment automatically."
          : ". (To push edits live automatically, redeploy once with “Save deploy for AI edits” checked.)"}
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          disabled={busy}
          placeholder='e.g. "Change the hero heading to Welcome to Acme" or "Update the footer email to hi@acme.com"'
          className="h-10 flex-1 rounded-lg border border-border-strong bg-background px-3 text-[13px] outline-none focus:border-foreground disabled:opacity-60"
        />
        <button
          onClick={run}
          disabled={busy || !instruction.trim()}
          className="h-10 shrink-0 rounded-lg bg-foreground px-4 text-[13px] font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Editing…" : "Apply with AI"}
        </button>
      </div>

      {lines.length > 0 && (
        <div className="mt-2 max-h-28 overflow-y-auto rounded-md bg-foreground/5 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
          {lines.map((l, i) => (
            <div key={i}>· {l}</div>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      {done && (
        <div
          className={`mt-2 rounded-md border px-3 py-2 text-[12px] ${
            done.applied > 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {done.applied > 0 ? `Applied ${done.applied} edit(s). ` : "No changes applied. "}
          {done.failed > 0 && `${done.failed} proposed edit(s) could not be matched and were skipped. `}
          {done.notAnalyzed > 0 &&
            `${done.notAnalyzed} page(s) could not be analyzed this run — apply the same edit again to cover them. `}
          {done.summary}
          {done.deployed && done.deployedUrl && (
            <>
              {" "}
              Live →{" "}
              <a href={done.deployedUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {done.deployedUrl}
              </a>
            </>
          )}
          {done.applied > 0 && !done.deployed && " Bundle updated — download or redeploy to publish."}
        </div>
      )}
    </div>
  );
}

export function DashboardView({ email, sites }: { email: string; sites: SiteRow[] }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[13px] underline">
            New conversion
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-[13px] hover:border-foreground"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="font-medium">Sites &amp; conversions ({sites.length})</h2>
        {sites.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            No conversions yet.{" "}
            <Link href="/" className="underline">
              Convert a Framer site
            </Link>{" "}
            while logged in to see it here.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {sites.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border bg-foreground/5 px-4 py-2.5">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 rounded-full border border-border-strong px-2 py-0.5 text-[11px] text-muted-foreground">
                      {s.outputKind === "nextjs" ? "Pure Next.js" : "Hybrid"}
                    </span>
                  </div>
                  <span className="text-[12px] text-muted-foreground">{fmtDate(s.createdAt)}</span>
                </div>
                <div className="px-4 py-3 text-[13px]">
                  <p className="truncate text-muted-foreground" title={s.framerUrl}>
                    {s.framerUrl}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span>Status: {s.status}</span>
                    {s.themeRef && (
                      <a href={`/api/download/${s.themeRef}`} className="underline">
                        Download bundle
                      </a>
                    )}
                  </div>

                  <AiEditPanel site={s} />

                  <div className="mt-3">
                    <h3 className="text-[12px] font-medium text-muted-foreground">
                      Deployed files ({s.deployments.length})
                    </h3>
                    {s.deployments.length === 0 ? (
                      <p className="mt-1 text-[12px] text-muted-foreground">Not deployed yet.</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {s.deployments.map((d) => (
                          <li key={d.id} className="flex items-center gap-2 text-[12px]">
                            <span className="rounded border border-border-strong px-1.5 py-0.5">
                              {d.provider}
                            </span>
                            <span>{d.status}</span>
                            {d.url && (
                              <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">
                                {d.url}
                              </a>
                            )}
                            <span className="text-muted-foreground">{fmtDate(d.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
