"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "idle" | "converting" | "done" | "error";
interface ManifestItem { path: string; bytes: number }
interface DoneReport {
  sourceUrl?: string;
  manifest?: ManifestItem[];
  totalFiles?: number;
  notes?: string[];
  pages?: { route: string }[];
}

function human(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " MB";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + " KB";
  return n + " B";
}

export default function NextJsConverter() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [lines, setLines] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [report, setReport] = useState<DoneReport | null>(null);
  const [error, setError] = useState("");

  async function convert() {
    if (!url.trim() || status === "converting") return;
    setStatus("converting");
    setLines([]);
    setJobId(null);
    setReport(null);
    setError("");
    try {
      const res = await fetch("/api/convert-nextjs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          if (!part.trim()) continue;
          let evt: { type: string; msg?: string; jobId?: string; report?: DoneReport; message?: string };
          try {
            evt = JSON.parse(part);
          } catch {
            continue;
          }
          if (evt.type === "progress" && evt.msg) setLines((p) => [...p, evt.msg!]);
          else if (evt.type === "done") {
            setJobId(evt.jobId || null);
            setReport(evt.report || null);
            setStatus("done");
          } else if (evt.type === "error") {
            setError(evt.message || "Conversion failed");
            setStatus("error");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setStatus("error");
    }
  }

  const busy = status === "converting";

  return (
    <div className="min-h-screen w-full">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[13px] font-bold text-background">
              F
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              Framer <span className="text-muted-foreground">→</span> Next.js Optimizer
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-[13px]">
            <Link href="/" className="text-muted-foreground hover:text-foreground">Hybrid converter</Link>
            <Link href="/speed" className="text-muted-foreground hover:text-foreground">PageSpeed checker</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="pt-14 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Convert to a pure Next.js project
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Paste a published Framer URL and get back a real, deployable{" "}
            <span className="font-medium text-foreground">Next.js App Router project</span> —
            one <code>app/&lt;route&gt;/page.tsx</code> per page, editable as normal React.
          </p>
          <div className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> this prioritizes giving
            you real Next.js code over the Lighthouse score. Framer&apos;s JS runtime is stripped
            (renders the design statically, no Framer animations); assets load from Framer&apos;s
            CDN. For the highest score, use the{" "}
            <Link href="/" className="underline">Hybrid converter</Link>.
          </div>
        </section>

        <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && convert()}
              placeholder="https://your-site.framer.website"
              spellCheck={false}
              disabled={busy}
              className="h-11 flex-1 rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none placeholder:text-muted-foreground focus:border-foreground disabled:opacity-60"
            />
            <button
              onClick={convert}
              disabled={busy || !url.trim()}
              className="h-11 rounded-lg bg-foreground px-5 text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Converting…" : "Convert to Next.js"}
            </button>
          </div>
        </section>

        {(busy || lines.length > 0) && (
          <section className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span className={`h-2 w-2 rounded-full ${busy ? "animate-pulse bg-emerald-500" : "bg-border-strong"}`} />
              <span className="text-[13px] font-medium">Pipeline</span>
            </div>
            <div className="max-h-44 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-muted-foreground">
              {lines.map((l, i) => (
                <div key={i}>· {l}</div>
              ))}
            </div>
          </section>
        )}

        {status === "error" && error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {status === "done" && jobId && report && (
          <section className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h2 className="text-[15px] font-semibold">Next.js project generated ✓</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {report.totalFiles} files · {report.pages?.length ?? 0} routes. Download, then{" "}
                <code>npm install &amp;&amp; npm run build</code>.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href={`/api/download/${jobId}`}
                  className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90"
                >
                  ↓ Download Next.js project (.zip)
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border px-4 py-2.5 text-[13px] font-medium">Project files</div>
              <ul className="max-h-72 divide-y divide-border overflow-y-auto text-[13px]">
                {report.manifest?.slice(0, 200).map((f) => (
                  <li key={f.path} className="flex items-center justify-between px-4 py-1.5">
                    <span className="truncate font-mono">{f.path}</span>
                    <span className="ml-3 shrink-0 text-muted-foreground">{human(f.bytes)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
