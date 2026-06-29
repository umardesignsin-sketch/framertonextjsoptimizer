"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Scores = {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
};
type DevicePair = { desktop: Scores | null; mobile: Scores | null };

const METRICS = [
  ["performance", "Performance"],
  ["seo", "SEO"],
  ["accessibility", "Accessibility"],
  ["bestPractices", "Best Practices"],
] as const;

function color(n: number): string {
  if (n >= 90) return "text-emerald-600";
  if (n >= 50) return "text-amber-500";
  return "text-red-500";
}
function avg(s: Scores): number {
  return Math.round((s.performance + s.seo + s.accessibility + s.bestPractices) / 4);
}

async function measure(url: string, strategy: "mobile" | "desktop"): Promise<Scores> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, strategy }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "measurement failed");
  return res.json();
}

export function SpeedCompare({
  initialOriginal = "",
  initialConverted = "",
  deployedUrl,
  compact = false,
  autoRun = false,
}: {
  initialOriginal?: string;
  initialConverted?: string;
  deployedUrl?: string | null;
  compact?: boolean;
  /** Measure automatically on mount when both URLs are present. */
  autoRun?: boolean;
}) {
  const [orig, setOrig] = useState(initialOriginal);
  const [conv, setConv] = useState(initialConverted);
  const [before, setBefore] = useState<DevicePair>({ desktop: null, mobile: null });
  const [after, setAfter] = useState<DevicePair>({ desktop: null, mobile: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const canUseDeployed = !!deployedUrl && deployedUrl !== conv;
  const haveResults = !!(before.desktop && after.desktop && before.mobile && after.mobile);

  const runWith = useCallback(async (o: string, c: string) => {
    if (!o.trim() || !c.trim()) return;
    setConv(c);
    setLoading(true);
    setError("");
    setBefore({ desktop: null, mobile: null });
    setAfter({ desktop: null, mobile: null });
    try {
      const [od, om, cd, cm] = await Promise.all([
        measure(o.trim(), "desktop"),
        measure(o.trim(), "mobile"),
        measure(c.trim(), "desktop"),
        measure(c.trim(), "mobile"),
      ]);
      setBefore({ desktop: od, mobile: om });
      setAfter({ desktop: cd, mobile: cm });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }, []);

  function run() {
    if (loading) return;
    void runWith(orig, conv);
  }

  // Auto-run once when a deploy finishes (deployedUrl arrives). Deferred via a
  // timeout so the measurement's state updates don't run synchronously inside
  // the effect.
  const autoRef = useRef<string>("");
  useEffect(() => {
    const target = deployedUrl && orig.trim() ? deployedUrl : "";
    if (!target || autoRef.current === target) return;
    autoRef.current = target;
    const o = orig.trim();
    const id = setTimeout(() => void runWith(o, target), 0);
    return () => clearTimeout(id);
  }, [deployedUrl, orig, runWith]);

  // Auto-run once on mount (e.g. right after a conversion) when both URLs are
  // supplied and autoRun is set. Deferred so state updates aren't synchronous.
  const mountRan = useRef(false);
  useEffect(() => {
    if (mountRan.current || !autoRun) return;
    const o = initialOriginal.trim();
    const c = initialConverted.trim();
    if (!o || !c) return;
    mountRan.current = true;
    autoRef.current = c;
    const id = setTimeout(() => void runWith(o, c), 0);
    return () => clearTimeout(id);
  }, [autoRun, initialOriginal, initialConverted, runWith]);

  function copyTo(label: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    });
  }
  function resultsText(): string {
    const dev = (d: "desktop" | "mobile") => {
      const b = before[d]!;
      const a = after[d]!;
      const rows = METRICS.map(
        ([k, l]) => `  ${l}: ${b[k]} → ${a[k]} (${a[k] - b[k] >= 0 ? "+" : ""}${a[k] - b[k]})`
      ).join("\n");
      return `${d[0].toUpperCase() + d.slice(1)} — overall ${avg(b)} → ${avg(a)}\n${rows}`;
    };
    return `PageSpeed: Framer vs converted\nOriginal: ${orig}\nConverted: ${conv}\n\n${dev("desktop")}\n\n${dev("mobile")}`;
  }
  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/speed?original=${encodeURIComponent(orig)}&converted=${encodeURIComponent(conv)}`
      : "";

  return (
    <div className={compact ? "" : "rounded-xl border border-border bg-background p-4"}>
      {!compact && <h2 className="text-[15px] font-semibold">PageSpeed: Framer vs converted</h2>}

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[12px] text-muted-foreground">Original (Framer) URL</span>
          <input
            type="url"
            value={orig}
            onChange={(e) => setOrig(e.target.value)}
            placeholder="https://your-site.framer.website"
            spellCheck={false}
            className="mt-1 h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-muted-foreground">Converted / deployed URL</span>
          <input
            type="url"
            value={conv}
            onChange={(e) => setConv(e.target.value)}
            placeholder="https://your-site.vercel.app"
            spellCheck={false}
            className="mt-1 h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={loading || !orig.trim() || !conv.trim()}
          className="h-10 rounded-lg bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Measuring…" : "Compare desktop + mobile"}
        </button>
        {canUseDeployed && (
          <button
            onClick={() => setConv(deployedUrl!)}
            className="text-[12px] font-medium text-foreground underline"
          >
            Use deployed URL →
          </button>
        )}
      </div>

      {loading && (
        <p className="mt-3 animate-pulse text-[13px] text-muted-foreground">
          Running Lighthouse on both sites, desktop &amp; mobile… ~30–60s.
        </p>
      )}
      {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}

      {haveResults && (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <DeviceTable label="Desktop" before={before.desktop!} after={after.desktop!} />
            <DeviceTable label="Mobile" before={before.mobile!} after={after.mobile!} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => copyTo("results", resultsText())}
              className="rounded-md border border-border-strong px-3 py-1.5 text-[12px] hover:border-foreground"
            >
              {copied === "results" ? "Copied ✓" : "Copy results"}
            </button>
            <button
              onClick={() => copyTo("link", shareLink)}
              className="rounded-md border border-border-strong px-3 py-1.5 text-[12px] hover:border-foreground"
            >
              {copied === "link" ? "Copied ✓" : "Copy share link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DeviceTable({ label, before, after }: { label: string; before: Scores; after: Scores }) {
  const overall = avg(after) - avg(before);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <span
          className={`text-[13px] font-semibold ${
            overall > 0 ? "text-emerald-600" : overall < 0 ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {overall > 0 ? "+" : ""}
          {overall} overall
        </span>
      </div>
      <table className="w-full text-[13px]">
        <thead className="text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 text-left font-medium">Metric</th>
            <th className="px-2 py-1.5 text-center font-medium">Framer</th>
            <th className="px-2 py-1.5 text-center font-medium">Converted</th>
            <th className="px-3 py-1.5 text-center font-medium">Δ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {METRICS.map(([key, lbl]) => {
            const b = before[key];
            const a = after[key];
            const d = a - b;
            return (
              <tr key={key}>
                <td className="px-3 py-1.5">{lbl}</td>
                <td className={`px-2 py-1.5 text-center font-semibold tabular-nums ${color(b)}`}>{b}</td>
                <td className={`px-2 py-1.5 text-center font-semibold tabular-nums ${color(a)}`}>{a}</td>
                <td
                  className={`px-3 py-1.5 text-center tabular-nums ${
                    d > 0 ? "text-emerald-600" : d < 0 ? "text-red-500" : "text-muted-foreground"
                  }`}
                >
                  {d > 0 ? "+" : ""}
                  {d}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
