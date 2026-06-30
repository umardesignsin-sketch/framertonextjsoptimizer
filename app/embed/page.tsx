"use client";

import { useEffect, useState } from "react";
import { SpeedCompare } from "@/components/SpeedCompare";

type Status = "idle" | "converting" | "done" | "error";
interface DoneReport {
  sourceUrl?: string;
  totalFiles?: number;
}

// Map a progress message to a climbing percentage (never decreases).
function nextPercent(prev: number, msg: string): number {
  const m = msg.toLowerCase();
  let target = prev;
  if (m.includes("fetch")) target = 15;
  else if (m.includes("discover")) target = 25;
  else if (m.includes("found")) target = 35;
  else if (m.includes("optimiz")) target = 58;
  else if (m.includes("self-host")) target = 80;
  return Math.min(92, Math.max(target, prev + 4));
}

function hostName(url?: string): string {
  try {
    return new URL(url || "").hostname.replace(/^www\./, "").replace(/\./g, "-");
  } catch {
    return "site";
  }
}

export default function EmbedWidget() {
  const [url, setUrl] = useState<string>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("url") || ""
      : ""
  );
  const [status, setStatus] = useState<Status>("idle");
  const [percent, setPercent] = useState(0);
  const [line, setLine] = useState("Converting & optimizing");
  const [jobId, setJobId] = useState<string | null>(null);
  const [report, setReport] = useState<DoneReport | null>(null);
  const [error, setError] = useState("");

  // Tell a parent page (script embed) our height so the iframe can auto-fit.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const post = () =>
      window.parent.postMessage(
        { type: "fno-embed-height", height: document.documentElement.scrollHeight },
        "*"
      );
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  async function convert() {
    if (!url.trim() || status === "converting") return;
    setStatus("converting");
    setPercent(6);
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
          if (evt.type === "progress" && evt.msg) {
            setLine("Converting & optimizing");
            setPercent((p) => nextPercent(p, evt.msg!));
          } else if (evt.type === "done") {
            setPercent(100);
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
  const filename = `${hostName(report?.sourceUrl || url)}-optimized.zip`;
  const previewUrl =
    jobId && typeof window !== "undefined"
      ? `${window.location.origin}/api/preview/${jobId}/`
      : "";

  return (
    <div className="mx-auto max-w-[620px] p-4">
      <div className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_4px_30px_rgba(0,0,0,0.07)]">
        {/* Browser chrome */}
        <div className="relative flex items-center border-b border-border bg-foreground/[0.025] px-4 py-3">
          <div className="absolute left-4 flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          </div>
          <div className="flex-1 text-center text-[12px] text-muted-foreground">
            framer-to-nextjs · converter
          </div>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Framer URL
          </label>

          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && convert()}
              placeholder="https://myportfolio.framer.website"
              spellCheck={false}
              disabled={busy}
              className="h-12 w-full rounded-xl border border-border bg-foreground/[0.02] pl-10 pr-12 text-[15px] outline-none placeholder:text-muted-foreground focus:border-foreground disabled:opacity-70"
            />
            <button
              onClick={convert}
              disabled={busy || !url.trim()}
              aria-label="Convert"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          {/* Progress */}
          {(busy || status === "done") && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">
                  {status === "done" ? "Converted & optimized" : line}
                </span>
                <span className="font-semibold tabular-nums">{percent}%</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Download */}
          {status === "done" && jobId && (
            <a
              href={`/api/download/${jobId}`}
              className="mt-4 flex h-12 items-center justify-between rounded-xl bg-foreground px-4 text-background transition-opacity hover:opacity-90"
            >
              <span className="flex items-center gap-2 text-[14px] font-medium">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
                </svg>
                {filename} generated
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
              </svg>
            </a>
          )}

          {/* Lighthouse comparison — original vs converted, auto-measured */}
          {status === "done" && jobId && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Lighthouse · original vs converted
              </div>
              <div className="mt-2">
                <SpeedCompare
                  compact
                  autoRun
                  initialOriginal={report?.sourceUrl || url}
                  initialConverted={previewUrl}
                />
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-[13px] text-red-500">{error}</p>}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Powered by Framer → static converter
      </p>
    </div>
  );
}
