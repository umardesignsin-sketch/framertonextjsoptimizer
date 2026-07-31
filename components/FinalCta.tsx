"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Figma: Homepage → "Final cta+Footer" → "FInal CTA" (node 5:547).
// A repeat of the hero converter, so it deliberately reuses the hero's
// .mktg-toggle / .mktg-surface / .mktg-pill classes rather than restating them.
//
// The section is full-bleed with a top/bottom rule, and the inner box carries
// the left/right rules — 952px surface + 48px padding on each side = 1048px.
export function FinalCta() {
  const router = useRouter();
  const pathname = usePathname();
  const [url, setUrl] = useState("");
  const [outputMode, setOutputMode] = useState<"hybrid" | "nextjs">("nextjs");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (!v) return;
    // Both pipelines run on the home page now; ?mode= picks the tab.
    const href = `/?url=${encodeURIComponent(v)}&mode=${outputMode}`;
    // Pushing to the route we're already on wouldn't remount the target page,
    // so its `?url=` prefill would never run. Hard-navigate in that case.
    if (pathname === "/") window.location.href = href;
    else router.push(href);
  }

  return (
    <section className="mktg-final-cta" aria-label="Start a new conversion">
      <div className="mktg-final-cta-box">
        <div className="mktg-final-cta-head">
          <h2 className="mktg-final-cta-title">Ready to convert your website?</h2>
          <p className="mktg-final-cta-subtitle">
            Paste your published Framer URL to generate a production-ready project in minutes.
          </p>
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
              <form className="mktg-pill" onSubmit={handleSubmit} noValidate>
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
      </div>
    </section>
  );
}
