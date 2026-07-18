"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpeedCompare } from "@/components/SpeedCompare";
import { AuthNavLink } from "@/components/AuthNavLink";
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
      <Header />
      <main className="mx-auto max-w-5xl px-5 pb-24">
        <Hero />
        <ConvertCard url={url} setUrl={setUrl} status={status} convert={convert} />

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
            <Link href="/framer-to-html" className="font-medium text-foreground">Framer to HTML Converter</Link>
            <Link href="/nextjs" className="text-muted-foreground hover:text-foreground">Pure Next.js</Link>
            <Link href="/speed" className="text-muted-foreground hover:text-foreground">PageSpeed checker</Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
          </nav>
        </div>
      </header>
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
          <Link href="/framer-to-html" className="font-medium text-foreground">
            Framer to HTML Converter
          </Link>
          <Link href="/nextjs" className="text-muted-foreground hover:text-foreground">
            Pure Next.js
          </Link>
          <Link href="/speed" className="text-muted-foreground hover:text-foreground">
            PageSpeed checker
          </Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground">
            Blog
          </Link>
          <AuthNavLink />
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-14 pb-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Convert Framer Websites to Next.js &amp; HTML
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Paste a published Framer URL and get a production-ready export: this captures the
        server-rendered HTML, strips Framer&apos;s JS runtime, self-hosts &amp; re-encodes
        images to WebP, inlines fonts, and runs an SEO pass — a deployable static bundle
        built for maximum Lighthouse scores. Prefer a dedicated{" "}
        <Link href="/framer-to-html" className="text-foreground underline underline-offset-2">Framer to HTML converter</Link>
        {" "}or a{" "}
        <Link href="/nextjs" className="text-foreground underline underline-offset-2">real Next.js project</Link>.
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
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
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
              <span className="ml-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
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

