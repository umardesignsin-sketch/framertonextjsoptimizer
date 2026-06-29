"use client";

import { useState } from "react";

interface DoneReport {
  manifest?: { path: string }[];
  totalFiles?: number;
  notes?: string[];
}

export default function EmbedWidget() {
  // Prefill from ?url= so an embed can target a specific site.
  const [url, setUrl] = useState<string>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("url") || ""
      : ""
  );
  const [status, setStatus] = useState<"idle" | "converting" | "done" | "error">("idle");
  const [line, setLine] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [report, setReport] = useState<DoneReport | null>(null);
  const [error, setError] = useState("");

  async function convert() {
    if (!url.trim() || status === "converting") return;
    setStatus("converting");
    setError("");
    setJobId(null);
    setReport(null);
    setLine("Starting…");
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), options: { mode: "hybrid" } }),
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
          if (evt.type === "progress" && evt.msg) setLine(evt.msg);
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
    <div className="mx-auto max-w-xl p-4">
      <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
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
            className="h-11 rounded-lg bg-foreground px-5 text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Converting…" : "Convert"}
          </button>
        </div>

        {busy && <p className="mt-3 animate-pulse text-[13px] text-muted-foreground">{line}</p>}
        {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}

        {status === "done" && jobId && (
          <div className="mt-4 rounded-lg border border-border p-3">
            <p className="text-[13px] font-medium">
              Converted ✓ {report?.totalFiles ? `(${report.totalFiles} files)` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
              <a className="underline" href={`/api/preview/${jobId}/`} target="_blank" rel="noopener noreferrer">
                Open preview ↗
              </a>
              <a className="underline" href={`/api/download/${jobId}`}>
                Download .zip
              </a>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Powered by Framer → static converter
      </p>
    </div>
  );
}
