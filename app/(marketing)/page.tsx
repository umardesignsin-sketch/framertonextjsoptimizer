"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpeedCompare } from "@/components/SpeedCompare";
import { AuthGateModal } from "@/components/AuthGateModal";
import { useAuthUser } from "@/components/useAuthUser";
import Link from "next/link";
import { FAQ, faqJsonLd, jsonLdScript } from "@/lib/site-meta";

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

function Home() {
  const searchParams = useSearchParams();
  const authState = useAuthUser();
  const [url, setUrl] = useState(() => searchParams.get("url") || "");
  const [status, setStatus] = useState<Status>("idle");
  const [lines, setLines] = useState<string[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [showAuthGate, setShowAuthGate] = useState(false);

  // options — the live tool runs Hybrid only (full fidelity + optimized assets).
  const mode = "hybrid" as const;

  const logRef = useRef<HTMLDivElement>(null);

  const pushLine = useCallback((l: string) => {
    setLines((prev) => [...prev, l]);
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }, []);

  const convert = useCallback(async (overrideUrl?: string) => {
    const targetUrl = overrideUrl ?? url;
    if (!targetUrl.trim() || status === "converting") return;
    if (authState !== "in") {
      setShowAuthGate(true);
      return;
    }
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
          url: targetUrl.trim(),
          options: { mode },
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
  }, [url, status, pushLine, authState]);

  // After returning from login/signup with ?url=&autoconvert=1 (set by the
  // auth gate), the pasted URL was already restored via the lazy useState
  // initializer above. Once the session is confirmed, auto-run the
  // conversion so signing in doesn't lose the user's input.
  useEffect(() => {
    if (authState !== "in") return;
    if (searchParams.get("autoconvert") !== "1") return;
    const prefill = searchParams.get("url");
    if (!prefill || status !== "idle") return;
    window.history.replaceState(null, "", "/");
    // Deferred: convert() sets state synchronously at its start, which the
    // set-state-in-effect rule flags if called directly from the effect body.
    const t = setTimeout(() => void convert(prefill), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState]);

  return (
    <div className="min-h-screen w-full">
      <main className="mx-auto max-w-5xl px-5 pb-24">
        <Hero />
        <div id="convert" className="scroll-mt-20">
          <ConvertCard url={url} setUrl={setUrl} status={status} convert={convert} />
        </div>
        <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Honest expectations:</span>{" "}
          SEO / Best-Practices / Accessibility reliably hit 95–100. Performance is 90–100 on
          desktop; mobile is typically 75–95 for marketing sites (Lighthouse throttles mobile CPU
          4×, so mobile always scores well below desktop — compare mobile-to-mobile). 100/100 on
          every site is not realistic.
        </p>

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

        <FeatureGrid />
        <AboutSection />
        <FaqSection />
      </main>
      {/* FAQPage structured data for rich results + answer engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd()) }}
      />

      {showAuthGate && (
        <AuthGateModal
          next={`/?url=${encodeURIComponent(url)}&autoconvert=1`}
          onClose={() => setShowAuthGate(false)}
        />
      )}
    </div>
  );
}

// useSearchParams() suspends — without a fallback the initial HTML is empty for
// crawlers. This shell ships H1 + FAQ + about so Google indexes real content.
function HomeSeoShell() {
  return (
    <div className="min-h-screen w-full">
      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="pt-14 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Convert Framer Websites to Next.js &amp; HTML
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Paste a published Framer URL and get a production-ready export: optimized static HTML
            or a real Next.js App Router project — strip Framer lock-in, boost Lighthouse &amp; SEO,
            host anywhere.
          </p>
        </section>
        <section className="rounded-xl border border-border bg-muted/40 p-5 text-[14px] text-muted-foreground">
          Loading converter…
        </section>
        <FeatureGrid />
        <AboutSection />
        <FaqSection />
      </main>
      {/* No FAQ JSON-LD here — the resolved <Home/> emits it; duplicating it
          in the Suspense fallback would leave two identical FAQPage blocks
          in the DOM. */}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSeoShell />}>
      <Home />
    </Suspense>
  );
}

// Lucide-style stroke icons — inline so there's no runtime dep and no
// broken-emoji fallback on machines missing the glyphs.
const ICONS: Record<string, React.ReactNode> = {
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}

// A Lighthouse-style score dial. Colour bands mirror Lighthouse: red < 50,
// amber < 90, green ≥ 90.
function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 90 ? "#0cce6b" : score >= 50 ? "#ffa400" : "#ff4e42";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 60 60" className="h-14 w-14 -rotate-90">
          <circle cx="30" cy="30" r={r} fill="none" strokeWidth="4" className="stroke-border" />
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <span className="text-[10.5px] text-muted-foreground">{label}</span>
    </div>
  );
}

// The hero product shot: a browser frame showing a before/after Lighthouse
// comparison — the product's core value prop, rendered as a real visual.
function HeroVisual() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_60%_20%,var(--accent-soft),transparent_70%)]"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/[0.06]">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex h-6 flex-1 items-center rounded-md bg-background px-3 text-[11px] text-muted-foreground">
            your-site.com
          </div>
        </div>
        <div className="p-5">
          <div className="text-[11.5px] font-medium text-muted-foreground">Lighthouse — mobile</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3.5">
              <div className="text-[11px] font-medium text-muted-foreground">Before · Framer</div>
              <div className="mt-3 flex justify-around">
                <ScoreRing score={42} label="Perf" />
                <ScoreRing score={71} label="SEO" />
              </div>
            </div>
            <div className="rounded-xl border border-accent/30 bg-accent-soft/50 p-3.5">
              <div className="text-[11px] font-medium text-accent">After · Optimized</div>
              <div className="mt-3 flex justify-around">
                <ScoreRing score={98} label="Perf" />
                <ScoreRing score={100} label="SEO" />
              </div>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700">
            <Icon name="zap" className="h-3.5 w-3.5" />
            −840&nbsp;KB JavaScript · runtime stripped
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative pt-14 pb-10 sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[420px] bg-[radial-gradient(50%_60%_at_50%_0%,var(--accent-soft),transparent_70%)]"
      />
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[12.5px] font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Free · No signup to preview
          </div>
          <h1 className="mt-5 text-[38px] font-semibold leading-[1.03] tracking-tight sm:text-[54px]">
            Convert Framer sites to{" "}
            <span className="bg-gradient-to-br from-accent to-[#8b5cf6] bg-clip-text text-transparent">
              Next.js &amp; HTML
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
            Paste a published Framer URL and get a production-ready export: it captures the
            server-rendered HTML, strips Framer&apos;s JS runtime, self-hosts &amp; re-encodes
            images to WebP, inlines fonts, and runs an SEO pass — a deployable bundle built for
            top Lighthouse scores.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#convert"
              className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-[14px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Convert your site free →
            </a>
            <Link
              href="/nextjs"
              className="inline-flex h-11 items-center rounded-full border border-border-strong px-5 text-[14px] font-medium transition-colors hover:bg-muted"
            >
              Pure Next.js export
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> Pixel-perfect fidelity
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> Self-hosted images
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> One-click deploy
            </span>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function ConvertCard(props: {
  url: string;
  setUrl: (v: string) => void;
  status: Status;
  convert: (overrideUrl?: string) => void;
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
          onClick={() => props.convert()}
          disabled={busy || !props.url.trim()}
          className="h-11 rounded-lg bg-accent px-5 text-[15px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Converting…" : "Convert"}
        </button>
      </div>

      <div className="mt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Hybrid mode — full fidelity, optimized
        </span>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      icon: "zap",
      title: "Strips the runtime",
      body: "Framer's JS bundle, hover-state machinery, and analytics beacon are removed — the server-rendered HTML ships as-is.",
    },
    {
      icon: "image",
      title: "Self-hosted, re-encoded images",
      body: "Every image is downloaded, converted to WebP, and served from your own domain instead of Framer's CDN.",
    },
    {
      icon: "search",
      title: "Full SEO pass",
      body: "Canonical tags, Open Graph, sitemaps, and structured data are checked and corrected automatically.",
    },
    {
      icon: "rocket",
      title: "Deploy in one click",
      body: "Push the optimized bundle straight to Netlify or Vercel, or download a real Next.js project to keep.",
    },
  ];
  return (
    <section className="mt-24">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-[12px] font-medium text-muted-foreground">
          Under the hood
        </div>
        <h2 className="mt-4 text-[28px] font-semibold tracking-tight sm:text-[34px]">
          Built for speed, kept pixel-perfect
        </h2>
        <p className="mt-3 text-[15.5px] leading-relaxed text-muted-foreground">
          Every conversion runs the same pipeline under the hood — no manual cleanup required.
        </p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-border bg-background p-6 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <Icon name={f.icon} />
            </div>
            <h3 className="mt-4 text-[16px] font-semibold">{f.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
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
  // Shared so the comparison can use the real deployed URL as its "after".
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

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
  const [save, setSave] = useState(false);
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
          save,
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
        Deploys the static bundle to a fresh site using your own token. By default the
        token is sent once to your host&apos;s API and never stored — unless you opt in
        below to enable live editing.
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

      <label className="mt-3 flex items-start gap-2 text-[12.5px] text-muted-foreground">
        <input
          type="checkbox"
          checked={save}
          onChange={(e) => setSave(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium text-foreground">Save deploy for live editing</span> — stores
          this token encrypted (AES-256) so the visual editor on your dashboard can publish future
          changes to this same live site. Requires being logged in.
        </span>
      </label>

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

// Crawlable, answer-engine-friendly explainer: a self-contained definition
// plus a clear "how it works" that AI overviews can quote directly.
function AboutSection() {
  const steps = [
    ["Paste a Framer URL", "Point the converter at any published Framer site — one page or hundreds."],
    ["We optimize every page", "The Framer runtime is stripped, images become self-hosted WebP, fonts are inlined, and an SEO pass runs."],
    ["Deploy or download", "Push it live to Netlify or Vercel in one click, or download a real Next.js project."],
    ["Edit and publish", "Change text, links, and images in the visual editor and publish straight to your live site."],
  ];
  return (
    <section className="mt-20 border-t border-border pt-12">
      <h2 className="text-2xl font-semibold tracking-tight">What is the Framer → Next.js Optimizer?</h2>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        The Framer → Next.js Optimizer is a free tool that converts any published{" "}
        <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Framer</a>{" "}
        site into a fast, deployable website. It captures your Framer pages, removes Framer&apos;s heavy
        JavaScript runtime, self-hosts and re-encodes images to{" "}
        <a href="https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types#webp_image" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">WebP</a>,
        inlines fonts, and runs an SEO pass — then gives you either an optimized static bundle or a real{" "}
        <a href="https://nextjs.org/docs/app" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Next.js App Router</a>{" "}
        project. The result loads faster, scores higher on{" "}
        <a href="https://developer.chrome.com/docs/lighthouse/overview" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Lighthouse</a>{" "}
        and improves{" "}
        <a href="https://web.dev/articles/vitals" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Core Web Vitals</a>, and can be deployed anywhere. If your goal is plain static
        files, see the step-by-step{" "}
        <Link href="/framer-to-html" className="text-foreground underline underline-offset-2">Framer to HTML guide</Link>.
      </p>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        Not sure which output to choose? The{" "}
        <Link href="/nextjs" className="text-foreground underline underline-offset-2">Pure Next.js export</Link>{" "}
        gives you real, editable code that renders identically to the source, while the Hybrid converter on
        this page strips the runtime for the highest scores. Either way, you can{" "}
        <Link href="/speed" className="text-foreground underline underline-offset-2">compare the converted site against your original</Link>{" "}
        with the PageSpeed checker, then deploy it to{" "}
        <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Netlify</a>{" "}or{" "}
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Vercel</a>{" "}
        in one click — or open a converted site in the{" "}
        <Link href="/nextjs" className="text-foreground underline underline-offset-2">Next.js project export</Link>{" "}
        and take the code with you.
      </p>
      <h3 className="mt-8 text-[15px] font-semibold">How it works</h3>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {steps.map(([title, body], i) => (
          <li key={title} className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] text-accent-foreground">
                {i + 1}
              </span>
              {title}
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
      <div className="mt-5 divide-y divide-border rounded-xl border border-border">
        {FAQ.map((f, i) => (
          <details key={f.q} className="group px-4" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-medium marker:content-none">
              <span>{f.q}</span>
              <span className="ml-3 shrink-0 text-accent transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-4 pr-6 text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

