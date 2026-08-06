import type { Metadata } from "next";
import Link from "next/link";
import { jsonLdScript, SITE } from "@/lib/site-meta";
import { TEMPLATES } from "@/lib/templates-data";

const TITLE = "Free Framer Templates | Portfolio & Website Templates by Umar Mirza";
const DESCRIPTION =
  "Free Framer templates for portfolios, agencies, SaaS, and photography — real, published website templates you can remix and launch today. No paywall, no signup required to preview.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "free website template",
    "framer portfolio template",
    "portfolio website template",
    "free framer template",
    "framer templates",
    "free portfolio template",
    "agency portfolio template",
    "saas landing page template",
  ],
  alternates: { canonical: "/templates" },
  openGraph: { type: "website", url: "/templates", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Are these Framer templates really free?",
    a: "Yes. Every template listed here is published on the Framer Marketplace with no upfront cost — click through to remix it directly in Framer's editor.",
  },
  {
    q: "Do I need a Framer account to use these templates?",
    a: "You'll need a free Framer account to remix and customize a template in the editor, same as any Framer marketplace template. Previewing the live demo site requires nothing at all.",
  },
  {
    q: "What's the difference between a portfolio template and a portfolio website builder?",
    a: "A template is a finished, pre-designed starting point — layout, sections, and styling already done — that you customize with your own content. This page lists ready-made Framer portfolio templates rather than a from-scratch builder.",
  },
  {
    q: "Can I use these templates for client work or an agency?",
    a: "The agency and consulting-tagged templates here (like Portfolie) are built specifically for that use case — creative agencies, design studios, and freelance client work.",
  },
  {
    q: "I already have a Framer site — can I convert it to Next.js or HTML later?",
    a: "Yes — once you've built your site from one of these templates and published it, you can convert it to a real Next.js project or optimized static HTML with the free converter on this site.",
  },
  {
    q: "Do these templates include animations and interactions?",
    a: "Most do — appear/scroll effects, CMS support, and in some cases custom cursors or code components, listed under each template's features.",
  },
];

function templatesJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: TEMPLATES.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
        url: `${SITE.url}/templates#${t.slug}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Free Framer Templates", item: `${SITE.url}/templates` },
      ],
    },
  ];
}

export default function TemplatesPage() {
  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <p className="page-breadcrumb">
                <Link href="/">Home</Link> / Templates
              </p>
              <h1 className="page-title">Free Framer Templates</h1>
            </div>
          </div>
          <div className="page-head-row">
            <div className="page-head-stack">
              <p className="page-intro is-wide">
                Real, published{" "}
                <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer">
                  Framer
                </a>{" "}
                templates by{" "}
                <a
                  href="https://www.framer.com/@umar-mirza/?tab=marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Umar Mirza
                </a>{" "}
                — portfolio, agency, SaaS, and photography website templates you can
                preview live and remix for free, no signup required just to look.
                Already have a site built from one of these?{" "}
                <Link href="/">Convert it to Next.js</Link> or{" "}
                <Link href="/">clean static HTML</Link> once it&apos;s live.
              </p>
              <p className="page-intro is-wide">
                Specifically after a{" "}
                <Link href="/free-portfolio-website">free portfolio website</Link> for
                yourself? See the portfolio-only shortlist.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="page-body is-compact">
        <div className="page-cards">
          {TEMPLATES.map((t) => (
            <article key={t.slug} id={t.slug} className="page-tpl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.image}
                alt={`${t.name} — ${t.tagline}`}
                className="page-tpl-img"
                loading="lazy"
              />
              <div className="page-tpl-body">
                <h2 className="page-tpl-name">{t.name}</h2>
                <p className="page-tpl-tagline">{t.tagline}</p>
                <p className="page-tpl-desc">{t.description}</p>
                <div className="page-tags">
                  {t.categories.map((c) => (
                    <span key={c} className="page-tag">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="page-tpl-actions">
                  <a
                    href={t.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="page-btn is-ghost is-sm"
                  >
                    Live preview ↗
                  </a>
                  <a
                    href={t.getUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="page-btn is-sm"
                  >
                    Get this template free →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="page-cta">
          <h2>Want more free Framer templates?</h2>
          <p>See the full, up-to-date collection on the Framer Marketplace.</p>
          <div className="page-btn-row">
            <a
              href="https://www.framer.com/@umar-mirza/?tab=marketplace"
              target="_blank"
              rel="noopener noreferrer"
              className="page-btn"
            >
              View marketplace profile ↗
            </a>
          </div>
        </div>

        <section className="page-section is-compact">
          <h2>Free Framer templates — FAQ</h2>
          <div className="page-faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {templatesJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </main>
  );
}
