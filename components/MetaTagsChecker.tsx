"use client";

import { useState } from "react";
import type { MetaCheckResult } from "@/lib/meta-check";

export function MetaTagsChecker() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MetaCheckResult | null>(null);

  async function run() {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/tools/meta-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setLoading(false);
    }
  }

  const host = (() => {
    try {
      return result ? new URL(result.url).hostname : "";
    } catch {
      return "";
    }
  })();

  const ogImage = result?.og.image || "";
  const cardTitle = result ? result.og.title || result.title || "(no title)" : "";
  const cardDesc = result ? result.og.description || result.description || "" : "";
  const errorCount = result?.issues.filter((i) => i.severity === "error").length ?? 0;
  const warnCount = result?.issues.filter((i) => i.severity === "warning").length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="https://example.com"
          spellCheck={false}
          className="h-10 flex-1 rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
        />
        <button
          onClick={run}
          disabled={loading || !url.trim()}
          className="h-10 rounded-lg bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Checking…" : "Check tags"}
        </button>
      </div>

      {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}

      {result && (
        <div className="mt-5 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Social preview
              </h3>
              <span className="text-[12px] text-muted-foreground">
                {errorCount > 0 ? (
                  <span className="font-medium text-red-500">{errorCount} issue{errorCount !== 1 ? "s" : ""}</span>
                ) : (
                  <span className="font-medium text-emerald-600">No critical issues</span>
                )}
                {warnCount > 0 && <span> · {warnCount} warning{warnCount !== 1 ? "s" : ""}</span>}
              </span>
            </div>

            <div className="mt-2 max-w-md overflow-hidden rounded-lg border border-border">
              {ogImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ogImage} alt="" className="aspect-[1.91/1] w-full object-cover" />
              ) : (
                <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-muted text-[12px] text-muted-foreground">
                  No og:image found
                </div>
              )}
              <div className="border-t border-border bg-muted px-3 py-2.5">
                <div className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{host}</div>
                <div className="mt-0.5 truncate text-[14px] font-semibold">{cardTitle}</div>
                {cardDesc && <div className="mt-0.5 line-clamp-2 text-[12.5px] text-muted-foreground">{cardDesc}</div>}
              </div>
            </div>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">Approximation of how this link renders on Slack, iMessage, and LinkedIn.</p>
          </div>

          {result.issues.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Issues</h3>
              <ul className="mt-2 space-y-1.5">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex gap-2 text-[13px]">
                    <span className={issue.severity === "error" ? "text-red-500" : "text-amber-500"}>
                      {issue.severity === "error" ? "✕" : "!"}
                    </span>
                    <span className="text-foreground/90">{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Raw tags found</h3>
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-[13px]">
                <tbody className="divide-y divide-border">
                  <Row label="title" value={result.title} />
                  <Row label="meta description" value={result.description} />
                  <Row label="canonical" value={result.canonical} />
                  <Row label="html lang" value={result.lang} />
                  <Row label="viewport" value={result.viewport} />
                  <Row label="robots" value={result.robots} />
                  <Row label="favicon" value={result.favicon} />
                  <Row label="og:title" value={result.og.title} />
                  <Row label="og:description" value={result.og.description} />
                  <Row label="og:image" value={result.og.image} />
                  <Row label="og:type" value={result.og.type} />
                  <Row label="og:site_name" value={result.og.siteName} />
                  <Row label="twitter:card" value={result.twitter.card} />
                  <Row label="twitter:image" value={result.twitter.image} />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-40 shrink-0 bg-muted px-3 py-1.5 align-top font-medium text-muted-foreground">{label}</td>
      <td className="break-all px-3 py-1.5">
        {value || <span className="text-muted-foreground">— not set —</span>}
      </td>
    </tr>
  );
}
