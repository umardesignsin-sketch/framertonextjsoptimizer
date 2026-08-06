import Link from "next/link";
import { SpeedCompare } from "@/components/SpeedCompare";

export const metadata = {
  title: { absolute: "Framer PageSpeed Checker | Compare Lighthouse Scores" },
  description:
    "Compare real Lighthouse / PageSpeed scores: original Framer site vs converted HTML or Next.js — desktop and mobile side by side.",
  // Self-canonicalize to the query-less path so the ?original/?converted variants
  // don't fragment indexing.
  alternates: {
    canonical: "/speed",
  },
  openGraph: {
    type: "website",
    url: "/speed",
    title: "Framer PageSpeed Checker | Compare Lighthouse Scores",
    description:
      "Compare real Lighthouse / PageSpeed scores: original Framer site vs converted HTML or Next.js — desktop and mobile side by side.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Framer PageSpeed Checker | Compare Lighthouse Scores",
    description:
      "Compare real Lighthouse / PageSpeed scores: original Framer site vs converted HTML or Next.js — desktop and mobile side by side.",
  },
};

export default async function SpeedPage({
  searchParams,
}: {
  searchParams: Promise<{ original?: string; converted?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <h1 className="page-title">Framer vs Converted — PageSpeed Comparison</h1>
            </div>
          </div>
          <div className="page-head-row">
            <div className="page-head-stack">
              <p className="page-intro is-wide">
                Compare a Framer site against its{" "}
                <Link href="/">converted version</Link> with real Google{" "}
                <a
                  href="https://developer.chrome.com/docs/lighthouse/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lighthouse
                </a>{" "}
                scores — Performance, SEO, Accessibility and Best Practices —
                measured on both <strong>desktop</strong> and <strong>mobile</strong>,
                the same engine behind{" "}
                <a href="https://pagespeed.web.dev" target="_blank" rel="noopener noreferrer">
                  PageSpeed Insights
                </a>{" "}
                and{" "}
                <a
                  href="https://web.dev/articles/vitals"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Core Web Vitals
                </a>
                .
              </p>
              <p className="page-intro is-wide">
                To create an optimized version to test, run your site through the{" "}
                <Link href="/">Hybrid converter</Link> for the highest scores, or the{" "}
                <Link href="/">Pure Next.js export</Link> for real, deployable
                code — then paste both URLs below.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="page-body is-narrow is-compact">
        <div className="page-widget">
          <SpeedCompare
            initialOriginal={sp.original ?? ""}
            initialConverted={sp.converted ?? ""}
          />
        </div>
      </div>
    </main>
  );
}
