"use client";

import { useState, useRef, useCallback, useEffect, Suspense, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { SpeedCompare } from "@/components/SpeedCompare";
import { AuthGateModal } from "@/components/AuthGateModal";
import { useAuthUser } from "@/components/useAuthUser";
import Link from "next/link";
import { faqJsonLd, jsonLdScript } from "@/lib/site-meta";

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
  // Both pipelines now run here. `?mode=` lets the other entry points (the
  // dashboard, the repeated CTA at the foot of the marketing pages) hand a
  // URL over with the right tab already selected, instead of sending the user
  // to a separate converter page.
  const [outputMode, setOutputMode] = useState<"hybrid" | "nextjs">(() =>
    searchParams.get("mode") === "hybrid" ? "hybrid" : "nextjs"
  );

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
      // Two pipelines, one identical NDJSON event stream (progress / done /
      // error), so the reader loop below is shared. Only the endpoint and the
      // request body differ — the Next.js route takes no options.
      const isNextJs = outputMode === "nextjs";
      const res = await fetch(isNextJs ? "/api/convert-nextjs" : "/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNextJs
            ? { url: targetUrl.trim() }
            : { url: targetUrl.trim(), options: { mode: "hybrid" } }
        ),
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
  }, [url, status, pushLine, authState, outputMode]);

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

  // Once a conversion starts the workspace takes over the whole page, matching
  // the design prototype's dedicated conversion screen. Crawlers never click
  // Convert, so status stays "idle" for them and the indexable marketing page
  // below is always what gets rendered for SEO.
  if (status !== "idle") {
    return (
      <ConversionWorkspace
        status={status}
        lines={lines}
        error={error}
        url={url}
        report={report}
        jobId={jobId}
        device={device}
        setDevice={setDevice}
        onRetry={() => convert(url)}
        onChangeUrl={() => {
          setStatus("idle");
          setLines([]);
          setReport(null);
          setJobId(null);
          setError("");
        }}
      />
    );
  }

  function handleHeroSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (!v) return;
    convert();
  }

  return (
    <div className="min-h-screen w-full">
      <main>
        {/* ── Hero with integrated conversion form ── */}
        <section className="mktg-hero" id="convert" aria-label="Start a new conversion">
          <div className="mktg-banner">
            <span className="mktg-badge">Free Public Beta</span>
            <div className="mktg-title-area">
              <h1 className="mktg-title">
                Production-ready HTML &amp; Next.js Converter
              </h1>
              <p className="mktg-subtitle">
                Convert your published Framer website into optimised HTML or a deployable Next.js
                project for free. Download, and deploy on the infrastructure you choose.
              </p>
            </div>
          </div>

          <div className="mktg-features">
            <div className="mktg-toggle" role="tablist" aria-label="Conversion output">
              <button
                type="button"
                role="tab"
                aria-selected={outputMode === "nextjs"}
                className={`mktg-tab${outputMode === "nextjs" ? " is-active" : ""}`}
                onClick={() => setOutputMode("nextjs")}
              >
                Convert to Next.js
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={outputMode === "hybrid"}
                className={`mktg-tab${outputMode === "hybrid" ? " is-active" : ""}`}
                onClick={() => setOutputMode("hybrid")}
              >
                Improve Site Performance
              </button>
            </div>

            <div className="mktg-surface">
              <div className="mktg-surface-bg" aria-hidden />
              <div className="mktg-pill-wrapper">
                <form className="mktg-pill" onSubmit={handleHeroSubmit} noValidate>
                  <input
                    type="url"
                    autoComplete="url"
                    placeholder="Paste your framer website url"
                    aria-label="Framer website URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button type="submit" disabled={!url.trim()}>
                    {outputMode === "nextjs" ? "Get Next.js file" : "Get HTML file"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <ImpactStats />

        <HowItWorks />

        <FaqSection />
      </main>

      {/* FAQPage structured data for rich results + answer engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd()) }}
      />

      {showAuthGate && (
        <AuthGateModal
          next={`/?url=${encodeURIComponent(url)}&mode=${outputMode}&autoconvert=1`}
          onClose={() => setShowAuthGate(false)}
        />
      )}
    </div>
  );
}

// useSearchParams() suspends — without a fallback the initial HTML is empty for
// crawlers. This shell ships the hero content (with H1) + FAQ so Google indexes real content.
function HomeSeoShell() {
  return (
    <div className="min-h-screen w-full">
      <main>
        <section className="mktg-hero">
          <div className="mktg-banner">
            <span className="mktg-badge">Free Public Beta</span>
            <div className="mktg-title-area">
              <h1 className="mktg-title">
                Production-ready HTML &amp; Next.js Converter
              </h1>
              <p className="mktg-subtitle">
                Convert your published Framer website into optimised HTML or a deployable Next.js
                project for free. Download, and deploy on the infrastructure you choose.
              </p>
            </div>
          </div>
          <div className="mktg-surface">
            <div className="mktg-surface-bg" aria-hidden />
            <div className="mktg-pill-wrapper">
              <div className="mktg-pill">
                <span style={{ color: "#8a8a8a", fontSize: "18px" }}>Loading converter…</span>
              </div>
            </div>
          </div>
        </section>

        <ImpactStats />
        <HowItWorks />
        <FaqSection />
      </main>
      {/* No FAQ JSON-LD here — the resolved <Home/> emits it */}
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


// Figma: Homepage → "How it works + Features section" (node 5:293).
// Full-bleed 2×2 card grid. Illustrations are static SVGs; card-0X-b.svg
// variants exist alongside the a variants for future animation.
function HowItWorks() {
  const cards = [
    {
      num: "01",
      illus: "/illustrations/card-01-a.svg",
      name: "Choose your output",
      desc: "Generate either optimized HTML or a production-ready Next.js project, depending on how you plan to continue your workflow.",
    },
    {
      num: "02",
      illus: "/illustrations/card-02-a.svg",
      name: "Paste your published website",
      desc: "Start with a published Framer website that you own or are authorized to migrate. We'll validate the URL and prepare it for conversion.",
    },
    {
      num: "03",
      illus: "/illustrations/card-03-a.svg",
      name: "Review the generated project",
      desc: "Preview the generated website and review the Lighthouse report before downloading or deploying your project.",
    },
    {
      num: "04",
      illus: "/illustrations/card-04.svg",
      name: "Download or deploy",
      desc: "Export your generated project or deploy it to your preferred hosting platform with a few clicks.",
    },
  ];

  return (
    <section className="mktg-how" id="how-it-works">
      <div className="mktg-how-head">
        <h2 className="mktg-how-title">See how every conversion works</h2>
        <p className="mktg-how-subtitle">
          From validating your published website to generating previews, Lighthouse reports, and
          downloadable files, every stage of the conversion process is visible before you deploy or
          export.
        </p>
      </div>

      <div className="mktg-how-cards">
        <div className="mktg-how-row">
          {cards.slice(0, 2).map((c) => (
            <div key={c.num} className="mktg-card">
              <div className="mktg-card-num" aria-hidden>
                <div className="mktg-card-num-dots">
                  <span className="mktg-card-num-dot" />
                  <span className="mktg-card-num-dot" />
                </div>
                <span className="mktg-card-num-label">{c.num}</span>
              </div>
              <div className="mktg-card-illus">
                {/* Below the fold, so these stay deferred even though the
                    files are now small (the Figma exports embedded full-res
                    PNGs; those rasters were re-encoded to WebP in place,
                    30 MB -> 0.6 MB across the set). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.illus} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="mktg-card-text">
                <p className="mktg-card-name">{c.name}</p>
                <p className="mktg-card-desc">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mktg-how-row">
          {cards.slice(2, 4).map((c) => (
            <div key={c.num} className="mktg-card">
              <div className="mktg-card-num" aria-hidden>
                <div className="mktg-card-num-dots">
                  <span className="mktg-card-num-dot" />
                  <span className="mktg-card-num-dot" />
                </div>
                <span className="mktg-card-num-label">{c.num}</span>
              </div>
              <div className="mktg-card-illus">
                {/* Below the fold, so these stay deferred even though the
                    files are now small (the Figma exports embedded full-res
                    PNGs; those rasters were re-encoded to WebP in place,
                    30 MB -> 0.6 MB across the set). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.illus} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="mktg-card-text">
                <p className="mktg-card-name">{c.name}</p>
                <p className="mktg-card-desc">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Figma: Homepage → "FAQ section" (node 5:474). Two columns: left heading/CTA,
// right interactive accordion. Same 80px side gutters as benefits/how-it-works.
function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const items = [
    {
      q: "What websites can I convert?",
      a: "You can convert publicly accessible Framer websites that you own or are authorized to migrate.",
    },
    {
      q: "Will the converted site improve SEO and Lighthouse scores?",
      a: "Optimized HTML exports can improve performance, SEO, and Core Web Vitals by reducing unnecessary runtime overhead and optimizing assets. Actual results depend on the original website.",
    },
    {
      q: "What's the difference between HTML and Next.js export?",
      a: "HTML Export generates an optimized static website that's ready to host almost anywhere. Next.js Export generates a production-ready Next.js project that developers can continue building on.",
    },
    {
      q: "Does it work with every Framer website?",
      a: "Most published Framer websites are supported. Results may vary for websites with complex custom code, third-party integrations, or unsupported features. We're continuously improving compatibility during beta.",
    },
    {
      q: "Does it support multi-page websites?",
      a: "Yes. Published multi-page Framer websites are discovered and converted while preserving their page structure.",
    },
    {
      q: "What do I get after conversion?",
      a: "Depending on your selection, you'll receive either an optimized HTML export or a production-ready Next.js project ready for download or deployment.",
    },
    {
      q: "Is FramerToNextJS affiliated with Framer?",
      a: "No. FramerToNextJS is an independent migration tool and is not affiliated with or endorsed by Framer.",
    },
  ];

  return (
    <section className="mktg-faq" id="faq">
      <div className="mktg-faq-left">
        <div className="mktg-faq-content">
          <h2 className="mktg-faq-title">Frequently asked questions</h2>
          <p className="mktg-faq-subtitle">
            We&apos;re actively improving the conversion engine. If something doesn&apos;t work as
            expected, please let us know—we&apos;re here to help.
          </p>
        </div>
        <a href="mailto:support@framertonextjs.com" className="mktg-faq-cta">
          Contact us
        </a>
      </div>
      <div className="mktg-faq-right">
        {items.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} className="mktg-faq-item">
              <button
                className="mktg-faq-item-header"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span className="mktg-faq-item-question">{item.q}</span>
                <span className="mktg-faq-item-icon" aria-hidden="true">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      transform: isOpen ? "rotate(45deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <path
                      d="M7 1V13M1 7H13"
                      stroke="#292929"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
              {isOpen && <p className="mktg-faq-item-answer">{item.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Figma: Homepage → "Frame" (node 5:275). Full-bleed section — the heading
// row and the benefit strip both use their own 80px side padding rather than
// inheriting the page's max-width wrapper, so this renders outside the
// `mx-auto max-w-5xl` container (see the call site) and manages its own
// horizontal rhythm at any viewport up to 1360px.
function ImpactStats() {
  const benefits = [
    { stat: "~91%", label: "Less JavaScript", detail: "Reduced from 920 KB to 80 KB by removing unnecessary runtime overhead." },
    { stat: "~68%", label: "Lighter images", detail: "Images re-encoded and optimized for faster delivery using modern WebP." },
    { stat: "~98", label: "Lighthouse scores", detail: "Typical score measured after conversion on a representative marketing website." },
  ];
  return (
    <section className="mktg-benefits">
      <div className="mktg-benefits-head">
        <h2 className="mktg-benefits-title">Optimized for faster delivery</h2>
        <p className="mktg-benefits-subtitle">
          Built to reduce unnecessary runtime overhead while preserving the published website experience.
        </p>
      </div>
      <div className="mktg-benefits-row">
        {benefits.map((b) => (
          <div key={b.label} className="mktg-benefit">
            <p className="mktg-benefit-stat">
              <span className="mktg-benefit-number">{b.stat}</span> {b.label}
            </p>
            <p className="mktg-benefit-detail">{b.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}


// ── Conversion workspace ──────────────────────────────────────────────
// Presents the single continuous /api/convert stream as distinct staged
// screens (validate → analyze → found → build → done/error). The stage is
// DERIVED from the real progress lines already being sent by lib/convert.ts
// (see the onProgress calls there) — nothing here is simulated or fake.
// There's no separate output-choice step because the live tool only runs
// Hybrid mode (see the `mode` constant above), so "found" surfaces that as
// a fact instead of a non-functional choice.

type Stage = "validate" | "analyze" | "found" | "build" | "done" | "error";

function deriveStage(status: Status, lines: string[]): Stage | null {
  if (status === "idle") return null;
  if (status === "error") return "error";
  if (status === "done") return "done";
  const hasDiscover = lines.some((l) => l.includes("Discovering pages"));
  const foundLine = lines.find((l) => /^Found \d+ page/.test(l));
  const hasBuild = lines.some((l) => /Optimizing|Self-hosting|Generating|Mirror mode/.test(l));
  if (!hasDiscover) return "validate";
  if (!foundLine) return "analyze";
  if (!hasBuild) return "found";
  return "build";
}

function railIndex(stage: Stage): number {
  if (stage === "validate") return 0;
  if (stage === "analyze" || stage === "found") return 1;
  if (stage === "build") return 2;
  return 3;
}

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Runs only while `active`; freezes at the final value once the job
// finishes so the "done" screen can show total build time.
function useElapsed(active: boolean): number {
  const [sec, setSec] = useState(0);
  const [wasActive, setWasActive] = useState(active);
  const startRef = useRef<number | null>(null);

  // Reset the counter on the transition into `active`, using React's
  // adjust-state-during-render pattern. Resetting inside the effect below
  // instead is a state write from an effect: it renders once with the stale
  // count before correcting itself, and trips react-hooks/set-state-in-effect.
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setSec(0);
  }

  useEffect(() => {
    if (!active) return;
    startRef.current = Date.now();
    const id = setInterval(() => {
      if (startRef.current) setSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  return sec;
}

// Four steps, not the prototype's five: the live tool has no output-choice
// stage because it runs Hybrid only (see the `mode` constant above). Showing
// an "Output" step that the user can't act on would be theatre.
function Rail({ index }: { index: number }) {
  const steps = ["Validate", "Analyze", "Convert", "Deliver"];
  return (
    <div className="progress-rail" aria-label="Conversion status">
      {steps.map((label, i) => (
        <Fragment key={label}>
          <div className={`rail-item${i < index ? " done" : i === index ? " active" : ""}`}>
            <span>0{i + 1}</span>
            <strong>{label}</strong>
          </div>
          {i < steps.length - 1 && <i aria-hidden="true" />}
        </Fragment>
      ))}
    </div>
  );
}

const BUILD_STEPS = [
  { match: /Optimizing/, label: "Optimize images" },
  { match: /Self-hosting.*font/i, label: "Self-host fonts" },
  { match: /Self-hosting.*video/i, label: "Self-host videos" },
  { match: /Generating Next\.js project|Mirror mode/, label: "Generate project" },
];

function ConversionWorkspace({
  status,
  lines,
  error,
  url,
  report,
  jobId,
  device,
  setDevice,
  onRetry,
  onChangeUrl,
}: {
  status: Status;
  lines: string[];
  error: string;
  url: string;
  report: Report | null;
  jobId: string | null;
  device: "desktop" | "mobile";
  setDevice: (d: "desktop" | "mobile") => void;
  onRetry: () => void;
  onChangeUrl: () => void;
}) {
  const stage = deriveStage(status, lines);
  const elapsed = useElapsed(status === "converting");
  if (!stage) return null;

  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  })();

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar">
        <Link className="brand" href="/dashboard" aria-label="FramerToNextJS dashboard">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
          FramerToNextJS
        </Link>
        <div className="conversion-identity">
          <span className="site-dot" aria-hidden="true" />
          <span>{host}</span>
          <button className="quiet-button" type="button" onClick={onChangeUrl}>
            Change
          </button>
        </div>
        <div className="top-actions" />
      </header>

      {stage !== "error" && <Rail index={railIndex(stage)} />}

      <main className="conversion-main">
        {stage === "validate" && (
          <section className="screen active" aria-labelledby="validate-title">
            <div className="screen-intro narrow">
              <p className="eyebrow">Step 01 — URL validation</p>
              <h1 id="validate-title">Let&rsquo;s make sure we can reach it.</h1>
              <p>
                We check the published site before collecting anything. Your URL is never shared
                or republished.
              </p>
            </div>
            <div className="validation-layout">
              <article className="panel validation-panel">
                <div className="url-pill">
                  <svg className="icon icon-sm" aria-hidden="true">
                    <use href="#i-arrow-up-right" />
                  </svg>
                  <strong>{host}</strong>
                  <span className="url-lock">Public URL</span>
                </div>
                <div className="validation-result">
                  <span className="result-orb" aria-hidden="true" />
                  <div>
                    <strong>Checking published site</strong>
                    <p>Confirming the URL is live and accessible.</p>
                  </div>
                  <span className="loading-line" aria-hidden="true" />
                </div>
                <div className="panel-footer">
                  <span>
                    <i className="secure-dot" aria-hidden="true" /> Read-only access
                  </span>
                </div>
              </article>
              <aside className="side-note">
                <p className="eyebrow">What we check</p>
                <ul>
                  <li>Published page can load</li>
                  <li>Site is publicly reachable</li>
                  <li>Framer assets are available</li>
                </ul>
                <p className="side-note-foot">
                  Password-protected sites need to be made public before conversion.
                </p>
              </aside>
            </div>
          </section>
        )}

        {stage === "analyze" && (
          <section className="screen active" aria-labelledby="analyze-title">
            <div className="screen-intro">
              <p className="eyebrow">Step 02 — Website analysis</p>
              <h1 id="analyze-title">Mapping your site structure.</h1>
              <p>
                We&rsquo;re reading what is actually published so your export starts with the right
                pages, assets, and breakpoints.
              </p>
            </div>
            <div className="analysis-grid">
              <article className="panel analysis-panel">
                <div className="analysis-header">
                  <div>
                    <p className="eyebrow">Live discovery</p>
                    <h2>Discovering pages</h2>
                  </div>
                  <span className="elapsed">{fmtElapsed(elapsed)} elapsed</span>
                </div>
                <div className="discovery-list">
                  {lines.map((l, i) => {
                    const isLast = i === lines.length - 1;
                    return (
                      <div className={`discovery-item ${isLast ? "working" : "complete"}`} key={i}>
                        <span className="state">{isLast ? "" : "✓"}</span>
                        <strong>{l}</strong>
                      </div>
                    );
                  })}
                </div>
                <div className="analysis-foot">
                  <i aria-hidden="true" />
                  <span>Finding linked and published routes…</span>
                </div>
              </article>
              <aside className="analysis-aside">
                <div className="skeleton browser-skeleton" aria-hidden="true">
                  <i /><b /><span /><span /><span />
                </div>
                <p className="eyebrow">Reading published layout</p>
                <p>
                  Page structure appears here as we learn it. This does not change your original
                  Framer site.
                </p>
              </aside>
            </div>
          </section>
        )}

        {stage === "found" &&
          (() => {
            const foundLine = lines.find((l) => /^Found \d+ page/.test(l));
            const count = foundLine?.match(/\d+/)?.[0] ?? "—";
            return (
              <section className="screen active" aria-labelledby="found-title">
                <div className="screen-intro">
                  <p className="eyebrow">Step 02 — Analysis complete</p>
                  <h1 id="found-title">We found a healthy site.</h1>
                  <p>Here&rsquo;s the scope we&rsquo;ll convert. Hybrid mode runs automatically.</p>
                </div>
                <div className="found-layout">
                  <article className="panel findings-card">
                    <div className="findings-heading">
                      <div>
                        <p className="eyebrow">What we found</p>
                        <h2>Conversion scope</h2>
                      </div>
                      <span className="site-status">
                        <i aria-hidden="true" />
                        Ready to convert
                      </span>
                    </div>
                    <div className="metrics">
                      <div>
                        <strong>{count}</strong>
                        <span>Published pages</span>
                      </div>
                      <div>
                        <strong>Hybrid</strong>
                        <span>Output mode</span>
                      </div>
                      <div>
                        <strong>{fmtElapsed(elapsed)}</strong>
                        <span>Elapsed</span>
                      </div>
                    </div>
                    <div className="panel-footer">
                      <span>
                        <i className="secure-dot" aria-hidden="true" /> Continuing automatically
                      </span>
                    </div>
                  </article>
                </div>
              </section>
            );
          })()}

        {stage === "build" &&
          (() => {
            const lastLine = lines[lines.length - 1] || "Building…";
            return (
              <section className="screen active" aria-labelledby="progress-title">
                <div className="screen-intro narrow center">
                  <p className="eyebrow">Step 03 — Conversion</p>
                  <h1 id="progress-title">Building your project.</h1>
                  <p>We&rsquo;ll keep this specific. Your Framer project stays untouched.</p>
                </div>
                <article className="panel progress-panel">
                  <div className="job-head">
                    <div>
                      <span className="status-dot running" aria-hidden="true" />
                      <strong>{lastLine}</strong>
                    </div>
                    <span id="job-time">{fmtElapsed(elapsed)}</span>
                  </div>
                  <div className="stage-list">
                    {BUILD_STEPS.map((s, i) => {
                      const hasStarted = lines.some((l) => s.match.test(l));
                      const isDone = BUILD_STEPS.slice(i + 1).some((n) =>
                        lines.some((l) => n.match.test(l)),
                      );
                      const cls = isDone ? "complete" : hasStarted ? "working" : "pending";
                      return (
                        <div key={s.label} className={`discovery-item ${cls}`}>
                          <span className="state">{isDone ? "✓" : hasStarted ? "" : i + 1}</span>
                          <strong>{s.label}</strong>
                          <small>{isDone ? "Done" : hasStarted ? "Running" : "Queued"}</small>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </section>
            );
          })()}

        {stage === "error" && (
          <section className="screen active" aria-labelledby="error-title">
            <div className="screen-intro narrow">
              <p className="eyebrow">Conversion stopped</p>
              <h1 id="error-title">We couldn&rsquo;t convert this site.</h1>
            </div>
            <article className="panel validation-panel">
              <div className="validation-result">
                <span className="error-badge" aria-hidden="true">!</span>
                <div>
                  <strong>{error || "Conversion failed."}</strong>
                  <p>Check that the site is published publicly and does not require a password.</p>
                </div>
                <button className="retry-button" type="button" onClick={onRetry}>
                  Try again
                </button>
              </div>
              <div className="panel-footer">
                <span>Nothing was changed on your Framer site.</span>
                <button className="quiet-button" type="button" onClick={onChangeUrl}>
                  Use a different URL
                </button>
              </div>
            </article>
          </section>
        )}

        {stage === "done" && report && jobId && (
          <section className="screen active" aria-labelledby="success-title">
            <div className="success-heading">
              <div>
                <p className="eyebrow">Step 04 — Project ready</p>
                <h1 id="success-title">Your project is ready.</h1>
                <p>
                  Everything is packaged and ready for review, download, or deployment. Completed
                  in {fmtElapsed(elapsed)}.
                </p>
              </div>
            </div>
            <Results report={report} jobId={jobId} device={device} setDevice={setDevice} />
          </section>
        )}
      </main>
    </div>
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


