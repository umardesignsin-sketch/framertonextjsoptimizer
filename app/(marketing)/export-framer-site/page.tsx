import type { Metadata } from "next";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";
import { jsonLdScript, SITE } from "@/lib/site-meta";

// Satellite page for: export framer site / how to export framer website
// Canonical stays here; strong internal link to /framer-to-html money page.

const TITLE = "How to Export a Framer Site (HTML & Next.js) — Free";
const DESCRIPTION =
  "Framer has no official export. Here’s how to export a Framer site to HTML or Next.js for free: convert your published URL, download a ZIP, and self-host anywhere.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "export framer site",
    "how to export framer website",
    "export framer to html",
    "framer export html",
    "can you export framer",
  ],
  alternates: { canonical: "/export-framer-site" },
  openGraph: {
    type: "website",
    url: "/export-framer-site",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can you export a Framer site?",
    a: "Not with Framer’s built-in tools. Framer does not offer HTML or full code export for published sites. You export using a third-party converter that reads your public URL and packages static HTML or a Next.js project.",
  },
  {
    q: "What is the easiest way to export a Framer website?",
    a: "Use a free Framer to HTML converter: paste the published site URL, wait about a minute, download the ZIP (or deploy to Netlify/Vercel). No Framer login or plugin required.",
  },
  {
    q: "Should I export Framer to HTML or Next.js?",
    a: "Export to HTML for the fastest static site and simple hosting. Export to Next.js when you want a real App Router codebase with full Framer runtime fidelity. Both start from the same published URL.",
  },
  {
    q: "Is exporting my Framer site free?",
    a: "Yes with this tool — convert, preview, and download free. Hosting can stay free on Netlify or Vercel free tiers for typical marketing sites.",
  },
];

const STEPS = [
  {
    name: "Publish the Framer project",
    text: "Only public pages can be exported. Confirm the site loads without login on framer.website or your custom domain.",
  },
  {
    name: "Choose HTML or Next.js",
    text: "HTML = portable static files + speed. Next.js = real code project + exact interactions.",
  },
  {
    name: "Run the converter",
    text: "Paste the URL into the Framer to HTML converter (or Next.js converter). Multi-page discovery is automatic.",
  },
  {
    name: "Download or deploy",
    text: "Get a ZIP, or push live. Point DNS at the new host when you’re ready to leave Framer hosting.",
  },
];

export default function ExportFramerSitePage() {
  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <p className="page-breadcrumb">
                <Link href="/">Home</Link> / Export Framer site
              </p>
              <h1 className="page-title">How to export a Framer site</h1>
            </div>
          </div>
          <div className="page-head-row">
            <p className="page-intro is-wide">
              Framer is excellent for design — but{" "}
              <strong>you cannot officially export a Framer site</strong> as HTML or a full project.
              If you need to leave Framer hosting, cut costs, or own portable files, you use a
              converter. The fastest free path is our{" "}
              <Link href="/">Framer to HTML converter</Link>: paste a published URL and
              download clean static HTML.
            </p>
          </div>
        </div>
      </section>

      <div className="page-body is-narrow is-compact">
        <div className="page-form-panel">
          <h2>Export Framer → HTML free</h2>
          <p>Opens the Framer to HTML converter with your URL ready.</p>
          <UrlFunnelForm cta="Export Framer site to HTML →" />
        </div>

        <section className="page-section is-compact">
          <h2>Why Framer has no native export</h2>
          <div className="page-prose is-sm">
            <p>
              Published Framer sites depend on Framer’s hosting stack (optimization, dynamic
              features, badge). Their help center states HTML export for self-hosting is not
              supported. That is why “export Framer site” and “Framer to HTML converter” searches
              exist — third-party tools capture the public rendered output visitors already get.
            </p>
          </div>
        </section>

        <section className="page-section is-compact">
          <h2>Export options compared</h2>
          <div className="page-table-wrap">
            <table className="page-table">
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Best for</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                <tr className="is-highlight">
                  <td>Framer to HTML converter</td>
                  <td>Speed, static hosting, remove badge, leave Framer billing</td>
                  <td>
                    <Link href="/" className="page-link">
                      Open tool
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td>Framer to Next.js</td>
                  <td>Developers who want a real App Router project</td>
                  <td>
                    <Link href="/" className="page-link">
                      Open tool
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td>Manual rebuild</td>
                  <td>Full redesign control, slowest</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="page-section is-compact">
          <h2>Steps to export your Framer website</h2>
          <ol className="page-steps">
            {STEPS.map((s, i) => (
              <li key={s.name} className="page-step">
                <div className="page-step-name">
                  <span className="page-step-num">{i + 1}</span>
                  {s.name}
                </div>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="page-section is-compact">
          <h2>Export Framer site — FAQ</h2>
          <div className="page-faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="page-cta">
          <h2>Ready to export?</h2>
          <p>
            Use the free <Link href="/">Framer to HTML converter</Link>.
          </p>
          <div className="page-cta-form">
            <UrlFunnelForm cta="Export to HTML →" />
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to export a Framer site",
            description: DESCRIPTION,
            step: STEPS.map((s, i) => ({
              "@type": "HowToStep",
              position: i + 1,
              name: s.name,
              text: s.text,
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
              {
                "@type": "ListItem",
                position: 2,
                name: "Export Framer site",
                item: `${SITE.url}/export-framer-site`,
              },
            ],
          }),
        }}
      />
    </main>
  );
}
