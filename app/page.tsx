"use client";

import { useState, useRef, useCallback } from "react";
import { SpeedCompare } from "@/components/SpeedCompare";
import { NO_MOBILE_OPT, type MobileOptimizations } from "@/lib/types";

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

  // options — the live tool runs Hybrid only (full fidelity + optimized assets).
  const mode = "hybrid" as const;

  // Mobile performance optimization checklist (all off by default).
  const [mobileOpt, setMobileOpt] = useState<MobileOptimizations>({ ...NO_MOBILE_OPT });
  const setOpt = useCallback((key: keyof MobileOptimizations, val: boolean) => {
    setMobileOpt((prev) => {
      if (key === "prioritizeMobileScore") {
        // Master switch toggles every option together.
        return {
          removeAnimations: val,
          removeTextEffects: val,
          removeScrollAnimations: val,
          reduceMotion: val,
          aggressiveImages: val,
          prioritizeMobileScore: val,
        };
      }
      const next = { ...prev, [key]: val };
      next.prioritizeMobileScore =
        next.removeAnimations &&
        next.removeTextEffects &&
        next.removeScrollAnimations &&
        next.reduceMotion &&
        next.aggressiveImages;
      return next;
    });
  }, []);

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
          options: { mode, mobileOpt },
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
  }, [url, status, mobileOpt, pushLine]);

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
          mobileOpt={mobileOpt}
          setOpt={setOpt}
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
            mobileOpt={mobileOpt}
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
        <nav className="flex items-center gap-5 text-[13px]">
          <a href="/speed" className="text-muted-foreground hover:text-foreground">
            PageSpeed checker
          </a>
          <a
            href="https://web.dev/articles/lighthouse-performance"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            About Lighthouse ↗
          </a>
        </nav>
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
  mobileOpt: MobileOptimizations;
  setOpt: (key: keyof MobileOptimizations, val: boolean) => void;
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

      <div className="mt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/5 px-2.5 py-1 text-[12px] font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
          Hybrid mode — full fidelity, optimized
        </span>
      </div>

      <Checklist mobileOpt={props.mobileOpt} setOpt={props.setOpt} disabled={busy} />
    </section>
  );
}

const CHECKLIST: {
  key: keyof MobileOptimizations;
  label: string;
  help: string;
}[] = [
  {
    key: "removeAnimations",
    label: "Remove animations on mobile devices",
    help: "Disables Framer motion animations below the mobile breakpoint. Desktop animations are preserved.",
  },
  {
    key: "removeTextEffects",
    label: "Remove text appear effects on mobile",
    help: "Drops character-by-character, word-by-word and reveal text animations on mobile. Normal text rendering is kept.",
  },
  {
    key: "removeScrollAnimations",
    label: "Remove scroll-triggered animations on mobile",
    help: "Removes viewport / IntersectionObserver scroll-reveal animations on mobile.",
  },
  {
    key: "reduceMotion",
    label: "Reduce motion for mobile users",
    help: "Respects prefers-reduced-motion and reduces heavy motion effects.",
  },
  {
    key: "aggressiveImages",
    label: "Optimize all images aggressively",
    help: "Smaller WebP encoding + lazy loading to cut image payload and reduce layout shift.",
  },
  {
    key: "prioritizeMobileScore",
    label: "Prioritize Lighthouse Mobile Score",
    help: "Master switch — applies the most aggressive safe optimizations (enables all of the above).",
  },
];

function Checklist({
  mobileOpt,
  setOpt,
  disabled,
}: {
  mobileOpt: MobileOptimizations;
  setOpt: (key: keyof MobileOptimizations, val: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
      <h3 className="text-[13px] font-semibold">Performance optimization checklist</h3>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        Optional — these mainly improve <span className="font-medium">mobile</span>{" "}
        performance. Desktop output is unaffected. Choose before converting.
      </p>
      <ul className="mt-3 space-y-2.5">
        {CHECKLIST.map((item) => {
          const checked = mobileOpt[item.key];
          return (
            <li key={item.key}>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => setOpt(item.key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-foreground disabled:opacity-50"
                />
                <span>
                  <span className="block text-[13px] font-medium leading-tight">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                    {item.help}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OptimizationSummary({ mobileOpt }: { mobileOpt: MobileOptimizations }) {
  const selected = CHECKLIST.filter((c) => mobileOpt[c.key]);
  if (selected.length === 0) return null;
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <h2 className="text-[15px] font-semibold">Performance optimizations applied</h2>
      <div className="mt-3 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Selected optimizations
          </div>
          <ul className="mt-1.5 space-y-1 text-[13px]">
            {selected.map((c) => (
              <li key={c.key} className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                {c.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Expected impact
          </div>
          <ul className="mt-1.5 space-y-1 text-[13px]">
            <li>Faster mobile rendering</li>
            <li>Reduced JavaScript execution</li>
            <li>Lower layout shifts</li>
            <li>Improved Lighthouse Mobile Performance</li>
          </ul>
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            This is an estimate only, not a guaranteed score.
          </p>
        </div>
      </div>
    </section>
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
  mobileOpt,
}: {
  report: Report;
  jobId: string;
  device: "desktop" | "mobile";
  setDevice: (d: "desktop" | "mobile") => void;
  mobileOpt: MobileOptimizations;
}) {
  const imgStat = report.stats.find((s) => s.label === "Image payload");
  const imgPct =
    imgStat && imgStat.before > 0
      ? Math.round((1 - imgStat.after / imgStat.before) * 100)
      : 0;
  // Shared so the comparison can use the real deployed URL as its "after".
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

  return (
    <div className="mt-8 space-y-6">
      <OptimizationSummary mobileOpt={mobileOpt} />

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

      <SpeedCompare
        initialOriginal={report.sourceUrl}
        initialConverted={
          typeof window !== "undefined" ? `${window.location.origin}/api/preview/${jobId}/` : ""
        }
        deployedUrl={deployedUrl}
        autoRun
      />

      <DeployPanel jobId={jobId} onDeployed={setDeployedUrl} />
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

function DeployPanel({
  jobId,
  onDeployed,
}: {
  jobId: string;
  onDeployed?: (url: string) => void;
}) {
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
      if (data?.url) onDeployed?.(data.url);
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
