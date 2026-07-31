import type { Metadata } from "next";
import Link from "next/link";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "Roadmap | Framer → Next.js Optimizer";
const DESCRIPTION =
  "What's actually shipped in the Framer → Next.js Optimizer, and what we're building next — no vague promises, just the real state of the product.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/roadmap" },
  openGraph: { type: "website", url: "/roadmap", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const SHIPPED: { title: string; body: string }[] = [
  {
    title: "Hybrid converter",
    body: "Strips Framer's runtime entirely, rebuilds animations in CSS + IntersectionObserver, re-encodes images to WebP, self-hosts fonts. Deploys as a static bundle you can host anywhere. Free.",
  },
  {
    title: "Pure Next.js export",
    body: "A real, deployable Next.js App Router project — one statically-prerendered route per page. Keeps Framer's runtime on purpose, so it renders byte-for-byte identical to the source.",
  },
  {
    title: "Visual editor",
    body: "Edit text, links, and images across desktop, tablet, and phone breakpoints, then publish straight to your live site.",
  },
  {
    title: "One-click deploy",
    body: "Push the converted project to Netlify or Vercel using your own account — or download it as a .zip and take it anywhere.",
  },
  {
    title: "Accessibility auto-fix",
    body: "Every Framer export we've tested ships without a lang attribute, without titled iframes, without a landmark, without a name on the icon that links to your homepage. We fix all four automatically, every time.",
  },
  {
    title: "PageSpeed checker",
    body: "Real Google Lighthouse scores, original vs. converted, desktop and mobile, side by side.",
  },
  {
    title: "Free tools",
    body: "A meta-tags & social-preview checker and a robots.txt generator — small utilities for shipping any site, not just ones converted here.",
  },
  {
    title: "10-template Lighthouse benchmark",
    body: "We converted 10 real Framer templates and published the honest, unedited results — including the ones that didn't flatter us.",
  },
];

const NEXT: { title: string; body: string }[] = [
  {
    title: "The same benchmark, run on Hybrid",
    body: "The 10-template test above was run on Pure Next.js — the mode that isn't optimizing for speed. We're running it again on Hybrid, the mode that is, so the performance claim is backed by a number instead of a description.",
  },
  {
    title: "Fixing oversized images",
    body: "Some converted pages still ship images larger than they're displayed at. There's real payload to cut here — we're being careful with it, since trimming responsive image variants risks a fidelity trade-off in Pure Next.js mode.",
  },
  {
    title: "AVIF as an option",
    body: "WebP is the default today. AVIF compresses further on browsers that support it — we're adding it as a choice, not a silent replacement.",
  },
  {
    title: "A copy pass on the pages we haven't gotten to",
    body: "The homepage, converter pages, and blog have had real attention. A few comparison and guide pages further down the site are next in line.",
  },
];

function roadmapJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Roadmap — what's shipped, what's next",
      description: DESCRIPTION,
      url: `${SITE.url}/roadmap`,
      publisher: { "@type": "Organization", name: "Framer → Next.js Optimizer" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Roadmap", item: `${SITE.url}/roadmap` },
      ],
    },
  ];
}

export default function RoadmapPage() {
  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <span className="mktg-badge">Roadmap</span>
              <h1 className="page-title">What&apos;s shipped. What&apos;s still being built.</h1>
            </div>
          </div>
          <div className="page-head-row">
            <p className="page-intro is-wide">
              No vague &quot;coming soon.&quot; Here&apos;s what actually works today, and what
              we&apos;re building next — in the order we&apos;re building it.
            </p>
          </div>
        </div>
      </section>

      <div className="page-body is-narrow is-compact">
        <section className="page-section">
          <h2 className="page-eyebrow">Shipped</h2>
          <div className="page-entries">
            {SHIPPED.map((item) => (
              <div key={item.title} className="page-entry">
                <div className="page-entry-head">
                  <h3>{item.title}</h3>
                  <span className="page-status is-live">live</span>
                </div>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="page-section">
          <h2 className="page-eyebrow">Next</h2>
          <div className="page-entries">
            {NEXT.map((item) => (
              <div key={item.title} className="page-entry">
                <div className="page-entry-head">
                  <h3>{item.title}</h3>
                  <span className="page-status is-building">building</span>
                </div>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="page-cta">
          <p>
            This page changes as the product does — no roadmap graveyard, no items that quietly
            never ship. For the principles behind these calls, read the{" "}
            <Link href="/manifesto">manifesto</Link>.
          </p>
          <div className="page-btn-row">
            <Link href="/#convert" className="page-btn">
              Convert your site free →
            </Link>
            <Link
              href="/blog/does-converting-framer-to-next-js-make-it-faster-10-real-templates-tested"
              className="page-btn is-ghost"
            >
              Read the 10-template benchmark
            </Link>
          </div>
        </div>
      </div>

      {roadmapJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </main>
  );
}
