"use client";

import { useState, useRef, useCallback } from "react";

type Stat = { label: string; before: number; after: number; unit: string };
type PageRef = { route: string; sourceUrl: string };
type ManifestItem = { path: string; bytes: number; kind: string };
type Report = {
  sourceUrl: string;
  pages: PageRef[];
  stats: Stat[];
  notes: string[];
  manifest: ManifestItem[];
  totalFiles: number;
};

type Status = "idle" | "converting" | "done" | "error";

function human(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + " MB";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + " KB";
  return n + " B";
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [lines, setLines] = useState<string[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  // options
  const [mode, setMode] = useState<"optimize" | "mirror" | "hybrid">("optimize");
  const [stripJs, setStripJs] = useState(true);
  const [optimizeImages, setOptimizeImages] = useState(true);
  const [selfHostFonts, setSelfHostFonts] = useState(true);
  const [maxPages, setMaxPages] = useState(10);

  const logRef = useRef<HTMLDivElement>(null);

  const pushLine = useCallback((l: string) => {
    setLines((prev) => [...prev, l]);
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }, []);

  const convert = useCallback(async () => {
    if (!url.trim() || status === "converting") return;
    setStatus("converting");
    setLines([]);
    setReport(null);
    setJobId(null);
    setError("");

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          options: { mode, stripJs, optimizeImages, selfHostFonts, maxPages },
        }),
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
          let evt: {
            type: string;
            msg?: string;
            jobId?: string;
            report?: Report;
            message?: string;
          };
          try {
            evt = JSON.parse(part);
          } catch {
            continue;
          }
          if (evt.type === "progress" && evt.msg) pushLine(evt.msg);
          else if (evt.type === "done" && evt.report) {
            setReport(evt.report);
            setJobId(evt.jobId || null);
            setStatus("done");
            pushLine("✓ Conversion complete");
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
  }, [url, status, mode, stripJs, optimizeImages, selfHostFonts, maxPages, pushLine]);

  return (
    <div className="min-h-screen w-full">
      <Header />
      <main className="mx-auto max-w-5xl px-5 pb-24">
        <Hero />
        <ConvertCard
          url={url}
          setUrl={setUrl}
          status={status}
          convert={convert}
          mode={mode}
          setMode={setMode}
          stripJs={stripJs}
          setStripJs={setStripJs}
          optimizeImages={optimizeImages}
          setOptimizeImages={setOptimizeImages}
          selfHostFonts={selfHostFonts}
          setSelfHostFonts={setSelfHostFonts}
          maxPages={maxPages}
          setMaxPages={setMaxPages}
        />

        {(status === "converting" || lines.length > 0) && (
          <LogPane lines={lines} logRef={logRef} active={status === "converting"} />
        )}

        {status === "error" && error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {status === "done" && report && jobId && (
          <Results
            report={report}
            jobId={jobId}
            device={device}
            setDevice={setDevice}
          />
        )}
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[13px] font-bold text-background">
            F
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            Framer <span className="text-muted-foreground">→</span> Next.js Optimizer
          </span>
        </div>
        <a
          href="https://web.dev/articles/lighthouse-performance"
          target="_blank"
          rel="noreferrer"
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          About Lighthouse ↗
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-14 pb-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Snapshot &amp; optimize your Framer site
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Paste a published Framer URL. This captures the server-rendered HTML, strips
        Framer&apos;s JS runtime, self-hosts &amp; re-encodes images to WebP, inlines
        fonts, and runs an SEO pass — then hands you a deployable static bundle built
        for maximum Lighthouse scores.
      </p>
      <div className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Honest expectations:</span>{" "}
        SEO / Best-Practices / Accessibility reliably hit 95–100. Performance is
        90–100 on desktop; mobile is typically 75–95 for marketing sites (Lighthouse
        throttles mobile CPU 4×, so mobile always scores well below desktop —
        compare mobile-to-mobile). 100/100 on every site is not realistic.
      </div>
    </section>
  );
}

function ConvertCard(props: {
  url: string;
  setUrl: (v: string) => void;
  status: Status;
  convert: () => void;
  mode: "optimize" | "mirror" | "hybrid";
  setMode: (v: "optimize" | "mirror" | "hybrid") => void;
  stripJs: boolean;
  setStripJs: (v: boolean) => void;
  optimizeImages: boolean;
  setOptimizeImages: (v: boolean) => void;
  selfHostFonts: boolean;
  setSelfHostFonts: (v: boolean) => void;
  maxPages: number;
  setMaxPages: (v: number) => void;
}) {
  const busy = props.status === "converting";
  return (
    <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={props.url}
          onChange={(e) => props.setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && props.convert()}
          placeholder="https://your-site.framer.website"
          spellCheck={false}
          disabled={busy}
          className="h-11 flex-1 rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none placeholder:text-muted-foreground focus:border-foreground disabled:opacity-60"
        />
        <button
          onClick={props.convert}
          disabled={busy || !props.url.trim()}
          className="h-11 rounded-lg bg-foreground px-5 text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Converting…" : "Convert"}
        </button>
      </div>

      {/* Mode selector: Optimize (fast, lossy) · Hybrid · Pixel-perfect. */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(
          [
            ["optimize", "Optimize", "Strip JS, rebuild for 100/100 (lossy)"],
            ["hybrid", "Hybrid", "Keep runtime + trim bloat — accurate & faster"],
            ["mirror", "Pixel-perfect", "Keep everything — identical to original"],
          ] as const
        ).map(([val, title, blurb]) => (
          <button
            key={val}
            type="button"
            disabled={busy}
            onClick={() => props.setMode(val)}
            aria-pressed={props.mode === val}
            className={`rounded-lg border p-3 text-left transition disabled:opacity-60 ${
              props.mode === val
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-border-strong"
            }`}
          >
            <div className="text-[14px] font-medium">{title}</div>
            <div className="text-[12px] text-muted-foreground">{blurb}</div>
          </button>
        ))}
      </div>

      <div
        className={`mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 ${
          props.mode !== "optimize" ? "pointer-events-none opacity-40" : ""
        }`}
      >
        <Toggle label="Strip JS runtime" checked={props.stripJs} onChange={props.setStripJs} disabled={busy || props.mode !== "optimize"} />
        <Toggle label="Optimize images (WebP)" checked={props.optimizeImages} onChange={props.setOptimizeImages} disabled={busy || props.mode !== "optimize"} />
        <Toggle label="Self-host fonts" checked={props.selfHostFonts} onChange={props.setSelfHostFonts} disabled={busy || props.mode !== "optimize"} />
        {props.mode === "mirror" && (
          <span className="text-[12px] text-muted-foreground">Optimizations off in pixel-perfect mode</span>
        )}
        {props.mode === "hybrid" && (
          <span className="text-[12px] text-muted-foreground">Hybrid auto-tunes these (runtime kept, images→WebP, trackers off)</span>
        )}
      </div>

      <div className="mt-3">
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Max pages
          <input
            type="number"
            min={1}
            max={50}
            value={props.maxPages}
            disabled={busy}
            onChange={(e) => props.setMaxPages(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className="h-8 w-16 rounded-md border border-border-strong bg-background px-2 text-center text-foreground outline-none focus:border-foreground disabled:opacity-60"
          />
        </label>
      </div>
    </section>
  );
}

function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      className="flex items-center gap-2 text-[13px] disabled:opacity-60"
    >
      <span
        className={`flex h-4 w-7 items-center rounded-full px-0.5 transition-colors ${
          props.checked ? "bg-foreground" : "bg-border-strong"
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full bg-background transition-transform ${
            props.checked ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
      <span className={props.checked ? "text-foreground" : "text-muted-foreground"}>
        {props.label}
      </span>
    </button>
  );
}

function LogPane({
  lines,
  logRef,
  active,
}: {
  lines: string[];
  logRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        {active ? (
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-border-strong" />
        )}
        <span className="text-[13px] font-medium">Pipeline</span>
      </div>
      <div
        ref={logRef}
        className="thin-scroll max-h-44 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-muted-foreground"
      >
        {lines.map((l, i) => (
          <div key={i} className={l.startsWith("✓") ? "text-emerald-600" : ""}>
            {l.startsWith("✓") ? "" : "· "}
            {l}
          </div>
        ))}
      </div>
    </section>
  );
}

function Results({
  report,
  jobId,
  device,
  setDevice,
}: {
  report: Report;
  jobId: string;
  device: "desktop" | "mobile";
  setDevice: (d: "desktop" | "mobile") => void;
}) {
  const imgStat = report.stats.find((s) => s.label === "Image payload");
  const imgPct =
    imgStat && imgStat.before > 0
      ? Math.round((1 - imgStat.after / imgStat.before) * 100)
      : 0;

  return (
    <div className="mt-8 space-y-6">
      {/* stat grid */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Measured results</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {imgStat && (
            <StatCard
              title="Image payload"
              value={`−${imgPct}%`}
              sub={`${human(imgStat.before)} → ${human(imgStat.after)}`}
              good
            />
          )}
          {report.stats
            .filter((s) => s.unit === "count" && s.label !== "Images self-hosted")
            .map((s) => (
              <StatCard key={s.label} title={s.label} value={String(s.before)} sub="" />
            ))}
          <StatCard title="Pages" value={String(report.pages.length)} sub="" />
          <StatCard title="Files in bundle" value={String(report.totalFiles)} sub="" />
        </div>
      </section>

      {/* notes */}
      {report.notes.length > 0 && (
        <section className="rounded-xl border border-border bg-background p-4">
          <h3 className="mb-2 text-[13px] font-semibold text-muted-foreground">
            Optimization notes
          </h3>
          <ul className="space-y-1 text-[13px]">
            {report.notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                {n}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* preview */}
      <section className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[13px] font-medium">Live preview</span>
          <div className="flex gap-1 rounded-md bg-muted p-0.5">
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`rounded px-2.5 py-1 text-[12px] capitalize ${
                  device === d ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-center bg-muted p-4">
          <iframe
            key={device}
            src={`/api/preview/${jobId}/`}
            title="preview"
            className="h-[560px] rounded-md border border-border bg-white shadow-sm"
            style={{ width: device === "mobile" ? 390 : "100%" }}
          />
        </div>
      </section>

      {/* actions */}
      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/download/${jobId}`}
          className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90"
        >
          ↓ Download .zip
        </a>
        <a
          href={`/api/preview/${jobId}/`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-lg border border-border-strong px-4 text-[14px] font-medium hover:bg-muted"
        >
          Open preview in new tab ↗
        </a>
      </div>

      <DeployPanel jobId={jobId} />
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  good,
}: {
  title: string;
  value: string;
  sub: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[12px] text-muted-foreground">{title}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${good ? "text-emerald-600" : ""}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11.5px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function DeployPanel({ jobId }: { jobId: string }) {
  const [provider, setProvider] = useState<"netlify" | "vercel">("netlify");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "deploying" | "done" | "error">("idle");
  const [result, setResult] = useState<{ url: string; adminUrl?: string } | null>(null);
  const [err, setErr] = useState("");

  const deploy = async () => {
    if (!token.trim()) return;
    setState("deploying");
    setErr("");
    setResult(null);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          provider,
          token: token.trim(),
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deploy failed");
      setResult(data);
      setState("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Deploy failed");
      setState("error");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-background p-5">
      <h3 className="text-[15px] font-semibold">Deploy</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Deploys the static bundle to a fresh site using your own token. The token is
        sent once to your host&apos;s API and never stored.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[12px] text-muted-foreground">Provider</label>
          <div className="flex gap-1 rounded-md bg-muted p-0.5">
            {(["netlify", "vercel"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`rounded px-3 py-1.5 text-[13px] capitalize ${
                  provider === p ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[12px] text-muted-foreground">
            {provider === "netlify" ? "Netlify personal access token" : "Vercel access token"}
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="paste token"
            className="h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] text-muted-foreground">Site name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="auto"
            className="h-10 w-36 rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
          />
        </div>
        <button
          onClick={deploy}
          disabled={state === "deploying" || !token.trim()}
          className="h-10 rounded-lg bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          {state === "deploying" ? "Deploying…" : "Deploy"}
        </button>
      </div>

      {state === "done" && result && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px]">
          Deployed →{" "}
          <a href={result.url} target="_blank" rel="noreferrer" className="font-medium text-emerald-700 underline">
            {result.url}
          </a>
        </div>
      )}
      {state === "error" && err && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {err}
        </div>
      )}
    </section>
  );
}
