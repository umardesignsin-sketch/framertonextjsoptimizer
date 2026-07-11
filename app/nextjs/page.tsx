"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthGateModal } from "@/components/AuthGateModal";
import { useAuthUser } from "@/components/useAuthUser";

type Status = "idle" | "converting" | "done" | "error";
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
            Convert to a pure Next.js project
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
            <span className="font-medium text-foreground">Note:</span> this prioritizes accuracy
            and real Next.js code over the{" "}
            <a href="https://developer.chrome.com/docs/lighthouse/overview" target="_blank" rel="noopener noreferrer" className="underline">Lighthouse</a>{" "}
            score. Framer&apos;s runtime is kept, so all content, animations, and interactivity render
            exactly like the source. For the highest score instead, use the{" "}
            <Link href="/" className="underline">Hybrid converter</Link>, or{" "}
            <Link href="/speed" className="underline">compare both against your original</Link>{" "}
            with the PageSpeed checker.
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
              </div>
            </div>

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
      </main>

      {showAuthGate && (
        <AuthGateModal
          next={`/nextjs?url=${encodeURIComponent(url)}&autoconvert=1`}
          onClose={() => setShowAuthGate(false)}
        />
      )}
    </div>
  );
}

export default function NextJsConverterPage() {
  return (
    <Suspense>
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
