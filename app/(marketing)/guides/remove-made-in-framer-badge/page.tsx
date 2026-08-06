import type { Metadata } from "next";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "Remove the Made in Framer Badge | Free Methods";
const DESCRIPTION =
  "How to remove the 'Made in Framer' badge: upgrade to a paid Framer plan, or export your site to HTML/Next.js — the badge is stripped automatically and hosting is free.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/guides/remove-made-in-framer-badge" },
  openGraph: { type: "website", url: "/guides/remove-made-in-framer-badge", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "How do I remove the 'Made in Framer' badge?",
    a: "Two real options: pay for a Framer site plan (the badge is a free-plan feature), or export your site — this converter removes the badge automatically during conversion, and the exported site can be hosted free on Netlify or Vercel.",
  },
  {
    q: "Can I remove the badge for free while staying on Framer?",
    a: "No — not legitimately. On Framer's free plan the badge is part of the deal, and hiding it with CSS or scripts violates Framer's terms and tends to break as Framer re-injects it. The free route that actually works is exporting the site off Framer hosting.",
  },
  {
    q: "Does the converter really strip the badge?",
    a: "Yes. The SEO pass removes the badge element and the runtime code that re-injects it. Your exported site ships clean — verified on every conversion.",
  },
  {
    q: "Is removing the badge from an exported site allowed?",
    a: "Yes. Once your site is exported and hosted on your own infrastructure, it's your own static files — Framer's badge requirement applies to sites on Framer's free hosting, not to self-hosted exports of your own work.",
  },
  {
    q: "What does it cost each way?",
    a: "Staying on Framer: a paid site plan (recurring, per site). Exporting: the conversion is free and free hosting tiers (Netlify, Vercel, Cloudflare Pages) serve converted sites at $0/month.",
  },
  {
    q: "Will exporting change how my site looks?",
    a: "No — the export preserves your design, fonts, and breakpoints. The HTML mode also makes it faster (runtime stripped, WebP images); the Next.js mode keeps everything pixel-identical.",
  },
];

function badgeJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Remove the Made in Framer badge", item: `${SITE.url}/guides/remove-made-in-framer-badge` },
      ],
    },
  ];
}

export default function RemoveBadgeGuide() {
  return (
    <>
      <main>
        <section className="page-head">
          <div className="page-head-box">
            <div className="page-head-row">
              <div className="page-head-stack">
                <nav className="page-breadcrumb">
                  <Link href="/">Home</Link> · Guides · Remove the badge
                </nav>
                <h1 className="page-title">
                  How to remove the &ldquo;Made in Framer&rdquo; badge
                </h1>
              </div>
            </div>
            <div className="page-head-row">
              <p className="page-intro is-wide">
                There are exactly <strong>two legitimate ways</strong>{" "}to remove the &ldquo;Made in
                Framer&rdquo; badge: pay for a Framer site plan, or export your site off Framer
                hosting. This converter takes the second route — the badge (and the runtime that
                re-injects it) is <strong>stripped automatically</strong> during conversion, and the
                exported site hosts free on Netlify or Vercel.
              </p>
            </div>
          </div>
        </section>

        <div className="page-body is-narrow is-compact">
          <section className="page-section is-compact">
            <h2>Your options, honestly compared</h2>
            <div className="page-table-wrap">
              <table className="page-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Works?</th>
                    <th>Cost</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Upgrade to a paid Framer plan</td>
                    <td>Yes</td>
                    <td>Recurring, per site</td>
                    <td>Simplest if you want to stay on Framer hosting.</td>
                  </tr>
                  <tr>
                    <td>Hide it with custom CSS/JS</td>
                    <td>No</td>
                    <td>—</td>
                    <td>Violates Framer&apos;s terms; the runtime re-injects the badge. Don&apos;t.</td>
                  </tr>
                  <tr className="is-highlight">
                    <td>Export the site (this tool)</td>
                    <td>Yes</td>
                    <td>Free</td>
                    <td>Badge removed automatically; site hosts free anywhere; also faster.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="page-section is-compact">
            <h2>The export route in practice</h2>
            <div className="page-prose is-sm">
              <p>
                Paste your published URL into the{" "}
                <Link href="/">Framer to HTML converter</Link> (or the{" "}
                <Link href="/">Next.js export</Link>). During the SEO pass the badge element
                and its re-injection code are removed, images are re-encoded to WebP, and canonicals
                are pointed at your domain. Deploy the result to Netlify or Vercel in one click,
                point your domain, and you&apos;re badge-free — with a faster site and no monthly
                Framer bill. Full walkthrough in the{" "}
                <Link href="/guides/self-host-framer">self-hosting guide</Link>.
              </p>
            </div>
          </section>

          <section className="page-section is-compact">
            <h2>FAQ</h2>
            <div className="page-faq">
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="page-cta">
            <h2>Remove the badge the free way</h2>
            <div className="page-cta-form">
              <UrlFunnelForm cta="Convert badge-free →" />
            </div>
          </section>
        </div>
      </main>

      {badgeJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </>
  );
}
