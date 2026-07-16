"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthGateModal } from "@/components/AuthGateModal";
import { useAuthUser } from "@/components/useAuthUser";
import { jsonLdScript, SITE } from "@/lib/site-meta";

type Status = "idle" | "converting" | "done" | "error";

// Page-specific FAQ — rendered visibly AND as FAQPage JSON-LD (must match).
const NEXTJS_FAQ: { q: string; a: string }[] = [
  {
    q: "Does Framer officially support Next.js export?",
    a: "No. Framer has no built-in code export — published sites stay on Framer's hosting. This converter fills that gap: it turns your published Framer site into a real Next.js App Router project you own and can deploy anywhere.",
  },
  {
    q: "What exactly do I get from the Next.js export?",
    a: "A complete, deployable Next.js project: one statically-prerendered App Router route per Framer page, plus package.json, tsconfig, and config. Run npm install && npm run build and it deploys like any Next.js app.",
  },
  {
    q: "Do my Framer animations and interactions still work?",
    a: "Yes — reproduced as real code, not Framer's runtime. Scroll/appear reveal animations are rebuilt as CSS + IntersectionObserver, and menu toggles as a small React component. There's no Framer runtime and no dependency on framerusercontent.com anywhere in the output.",
  },
  {
    q: "Do I need my Framer login or an API key?",
    a: "No. Only the public published URL is needed. No Framer account access, no API key, nothing to install.",
  },
  {
    q: "Are SEO meta tags, Open Graph, and canonicals preserved?",
    a: "Yes. Each exported page keeps its title, description, and Open Graph tags. The Hybrid (HTML) mode additionally rewrites canonicals to your new domain and runs a full SEO pass.",
  },
  {
    q: "Can I host the export on Vercel, Netlify, or Cloudflare?",
    a: "Yes. It's a standard Next.js project, so it deploys to Vercel or Netlify in one click from this tool (or anywhere Next.js runs, including Cloudflare). You can also download the .zip and use your own pipeline.",
  },
  {
    q: "Next.js export vs HTML export — which should I choose?",
    a: "Choose Next.js when you want a real React/App Router codebase to keep building on — components, TypeScript, npm install && npm run build. Choose the HTML export when you want plain static files with zero framework. Both strip Framer's runtime and self-host every asset; you can run both and compare.",
  },
  {
    q: "Is exporting my Framer site legal?",
    a: "Yes, for your own site. The converter only works with public published URLs, and you should only convert sites you own or have permission to export. It never bypasses logins or accesses private drafts.",
  },
  {
    q: "How long does the conversion take?",
    a: "Usually under a minute. Multi-page sites are discovered and converted automatically; larger sites can take a few minutes.",
  },
  {
    q: "Is it free?",
    a: "Yes — converting, previewing, and downloading the project are free. Deploying uses your own free Netlify or Vercel account, and there are no per-site fees.",
  },
];

const NEXTJS_STEPS = [
  { name: "Publish your Framer site", text: "Make sure the site is live on a public URL, like https://your-site.framer.website or a custom domain." },
  { name: "Paste the URL and convert", text: "The converter discovers every page and generates one prerendered Next.js route per page — no plugin or code needed." },
  { name: "Download the project", text: "Get a complete Next.js App Router project as a .zip: run npm install && npm run build and it's ready." },
  { name: "Deploy anywhere", text: "Push it live to Vercel or Netlify in one click, or deploy through your own pipeline like any Next.js app." },
];

function nextjsJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: NEXTJS_FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to convert a Framer site to Next.js",
      description: "Convert any published Framer website into a deployable Next.js App Router project in four steps.",
      totalTime: "PT2M",
      step: NEXTJS_STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Convert Framer to Next.js", item: `${SITE.url}/nextjs` },
      ],
    },
  ];
}
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

function NextJsConverter() {
  const searchParams = useSearchParams();
  const authState = useAuthUser();
  const [url, setUrl] = useState(() => searchParams.get("url") || "");
  const [status, setStatus] = useState<Status>("idle");
  const [lines, setLines] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [report, setReport] = useState<DoneReport | null>(null);
  const [error, setError] = useState("");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  async function convert(overrideUrl?: string) {
    const targetUrl = overrideUrl ?? url;
    if (!targetUrl.trim() || status === "converting") return;
    if (authState !== "in") {
      setShowAuthGate(true);
      return;
    }
    setStatus("converting");
    setLines([]);
    setJobId(null);
    setReport(null);
    setError("");
    try {
      const res = await fetch("/api/convert-nextjs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl.trim() }),
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

  // After returning from login/signup with ?url=&autoconvert=1 (set by the
  // auth gate), the pasted URL was already restored via the lazy useState
  // initializer above. Once the session is confirmed, auto-run the
  // conversion so signing in doesn't lose the user's input.
  useEffect(() => {
    if (authState !== "in") return;
    if (searchParams.get("autoconvert") !== "1") return;
    const prefill = searchParams.get("url");
    if (!prefill || status !== "idle") return;
    window.history.replaceState(null, "", "/nextjs");
    // Deferred: convert() sets state synchronously at its start, which the
    // set-state-in-effect rule flags if called directly from the effect body.
    const t = setTimeout(() => void convert(prefill), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState]);

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
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="pt-14 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Convert Framer to Next.js
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Paste a published{" "}
            <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Framer</a>{" "}
            URL and get back a real, deployable{" "}
            <a href="https://nextjs.org/docs/app" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Next.js App Router</a>{" "}
            project — one statically-prerendered route per page that renders{" "}
            <span className="font-medium text-foreground">identically to the original</span>. Deploy it to{" "}
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Vercel</a>{" "}or{" "}
            <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Netlify</a>{" "}
            in one click, or preview the difference with the{" "}
            <Link href="/speed" className="text-foreground underline underline-offset-2">PageSpeed checker</Link>.
          </p>
          <div className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> every page is a genuine
            React Server Component — real JSX, split into reusable components under{" "}
            <code>app/_components/</code>, no Framer runtime and no dependency on{" "}
            <code>framerusercontent.com</code> anywhere. Prefer plain static files with zero
            framework instead? Use the{" "}
            <Link href="/" className="underline">Hybrid converter</Link>, or{" "}
            <Link href="/speed" className="underline">compare both against your original</Link>{" "}
            with the{" "}
            <a href="https://developer.chrome.com/docs/lighthouse/overview" target="_blank" rel="noopener noreferrer" className="underline">Lighthouse</a>{" "}
            PageSpeed checker.
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
              onClick={() => convert()}
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
                <a
                  href={`/api/preview/${jobId}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-lg border border-border-strong px-4 text-[14px] font-medium hover:bg-muted"
                >
                  Open preview in new tab ↗
                </a>
              </div>
            </div>

            {/* preview — same optimized, runtime-free HTML the shipped page.tsx JSX
                is derived from, so it renders (including animations) without needing
                to run npm install/build or deploy anywhere first. */}
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

            <DeployPanel jobId={jobId} />

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

        {/* How it works — matches the HowTo schema below */}
        <section className="mt-20 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold tracking-tight">How to convert Framer to Next.js</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {NEXTJS_STEPS.map((s, i) => (
              <li key={s.name} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
                    {i + 1}
                  </span>
                  {s.name}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
            Prefer plain static files instead of a codebase? Use the{" "}
            <Link href="/framer-to-html" className="text-foreground underline underline-offset-2">Framer to HTML export</Link>{" "}
            — and read the{" "}
            <Link href="/guides/self-host-framer" className="text-foreground underline underline-offset-2">self-hosting guide</Link>{" "}
            for where to put it.
          </p>
        </section>

        {/* FAQ — matches the FAQPage schema below */}
        <section className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Convert Framer to Next.js — FAQ</h2>
          <div className="mt-5 divide-y divide-border rounded-xl border border-border">
            {NEXTJS_FAQ.map((f, i) => (
              <details key={f.q} className="group px-4" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-medium marker:content-none">
                  <span>{f.q}</span>
                  <span className="ml-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 pr-6 text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {nextjsJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}

      {showAuthGate && (
        <AuthGateModal
          next={`/nextjs?url=${encodeURIComponent(url)}&autoconvert=1`}
          onClose={() => setShowAuthGate(false)}
        />
      )}
    </div>
  );
}

// useSearchParams() suspends — fallback ships H1 + FAQ for crawlers/SSR.
function NextjsSeoShell() {
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
            <Link href="/framer-to-html" className="text-muted-foreground hover:text-foreground">Framer to HTML</Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="pt-14 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Convert Framer to Next.js
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Paste a published Framer URL and get a real, deployable Next.js App Router project —
            one statically-prerendered route per page that renders identically to the original.
          </p>
        </section>
        <section className="rounded-xl border border-border bg-muted/40 p-5 text-[14px] text-muted-foreground">
          Loading converter…
        </section>
        <section className="mt-20 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold tracking-tight">How to convert Framer to Next.js</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {NEXTJS_STEPS.map((s, i) => (
              <li key={s.name} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
                    {i + 1}
                  </span>
                  {s.name}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Convert Framer to Next.js — FAQ</h2>
          <div className="mt-5 divide-y divide-border rounded-xl border border-border">
            {NEXTJS_FAQ.map((f, i) => (
              <details key={f.q} className="group px-4" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-medium marker:content-none">
                  <span>{f.q}</span>
                  <span className="ml-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 pr-6 text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      {nextjsJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </div>
  );
}

export default function NextJsConverterPage() {
  return (
    <Suspense fallback={<NextjsSeoShell />}>
      <NextJsConverter />
    </Suspense>
  );
}

function DeployPanel({ jobId }: { jobId: string }) {
  const [provider, setProvider] = useState<"netlify" | "vercel">("netlify");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [save, setSave] = useState(true);
  const [state, setState] = useState<"idle" | "deploying" | "done" | "error">("idle");
  const [result, setResult] = useState<{ url: string } | null>(null);
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
        body: JSON.stringify({ jobId, provider, token: token.trim(), name: name.trim() || undefined, save }),
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
      <h3 className="text-[15px] font-semibold">Deploy &amp; save for live editing</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Publishes your pages as a live site using your own token — no build step, renders exactly like
        the source. Keep{" "}
        <span className="font-medium text-foreground">Save deploy for live editing</span> checked so the
        visual editor on your dashboard can push text, link, and image changes straight to this site.
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
        <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="mt-0.5" />
        <span>
          <span className="font-medium text-foreground">Save deploy for live editing</span> — stores this
          token encrypted (AES-256) so the visual editor can publish future changes to this same live
          site. Requires being logged in.
        </span>
      </label>

      {state === "error" && err && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{err}</div>
      )}
      {state === "done" && result && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px]">
          Deployed →{" "}
          <a href={result.url} target="_blank" rel="noreferrer" className="font-medium text-emerald-700 underline">
            {result.url}
          </a>
          . Open the editor from your{" "}
          <Link href="/dashboard" className="underline">dashboard</Link> to edit it live.
        </div>
      )}
    </section>
  );
}
