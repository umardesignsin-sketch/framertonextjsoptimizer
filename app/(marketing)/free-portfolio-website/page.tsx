import type { Metadata } from "next";
import Link from "next/link";
import { jsonLdScript, SITE } from "@/lib/site-meta";
import { TEMPLATES } from "@/lib/templates-data";

const TITLE = "Free Portfolio Website Templates — Real, Published Sites | Umar Mirza";
const DESCRIPTION =
  "Build a free portfolio website from a real, published Framer template — for designers, developers, photographers, and freelancers. Preview live, remix for free, no signup required to look.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "free portfolio website",
    "free portfolio website templates",
    "free portfolio website examples",
    "free portfolio website for photographers",
    "free portfolio template",
    "portfolio website template",
    "framer portfolio template",
  ],
  alternates: { canonical: "/free-portfolio-website" },
  openGraph: { type: "website", url: "/free-portfolio-website", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const PORTFOLIO_TEMPLATES = TEMPLATES.filter((t) => t.categories.includes("Portfolio"));

const FAQ: { q: string; a: string }[] = [
  {
    q: "How is this different from Wix, Squarespace, or Canva's free portfolio builder?",
    a: "Those are from-scratch, drag-and-drop builders — you design every section yourself. These are finished Framer templates: the layout, sections, and styling are already done, and you just swap in your own work. If you want a blank-canvas builder instead, Wix/Squarespace/Canva are the better fit for that specific job.",
  },
  {
    q: "Is a Framer portfolio website actually free?",
    a: "Yes. Every template here is published on the Framer Marketplace with no upfront cost, and Framer's own free tier lets you publish it live on a [yourname].framer.website domain with no credit card. A custom domain or removing the Framer badge needs a paid Framer plan.",
  },
  {
    q: "What's the best free portfolio website template for photographers?",
    a: "Photograph, below — built specifically for photographers, videographers, and content creators who need a clean, image-first layout without customizing a general-purpose template.",
  },
  {
    q: "What's the best one for developers?",
    a: "Portfolioxo — a developer-focused template with a built-in blog layout, aimed at engineers and technical freelancers who want to show projects and writing together.",
  },
  {
    q: "Do I need a Framer account?",
    a: "You need a free Framer account to remix and customize a template in the editor, same as any Framer marketplace template. Previewing the live demo sites below requires nothing at all.",
  },
  {
    q: "Once my portfolio is live, can I move it off Framer?",
    a: "Yes — paste the published URL into the free converter on this site and get a real Next.js project or clean static HTML, self-hosted anywhere, no Framer runtime or monthly hosting fee required.",
  },
];

function pageJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: PORTFOLIO_TEMPLATES.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
        url: `${SITE.url}/free-portfolio-website#${t.slug}`,
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
        { "@type": "ListItem", position: 2, name: "Free Portfolio Website", item: `${SITE.url}/free-portfolio-website` },
      ],
    },
  ];
}

export default function FreePortfolioWebsitePage() {
  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <p className="page-breadcrumb">
                <Link href="/">Home</Link> / <Link href="/templates">Templates</Link> / Free Portfolio
                Website
              </p>
              <h1 className="page-title">Build a free portfolio website</h1>
            </div>
          </div>
          <div className="page-head-row">
            <div className="page-head-stack">
              <p className="page-intro is-wide">
                {PORTFOLIO_TEMPLATES.length} real, published{" "}
                <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer">
                  Framer
                </a>{" "}
                portfolio templates — for designers, developers, photographers, and freelancers.
                Preview each live site, then remix it for free directly in Framer&apos;s editor. No
                signup required just to look.
              </p>
              <p className="page-intro is-wide">
                Looking for something outside portfolios — agency, SaaS, or business templates too?
                See the <Link href="/templates">full template catalog</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="page-body is-compact">
        <div className="page-cards">
          {PORTFOLIO_TEMPLATES.map((t) => (
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

        <div className="page-cta is-left">
          <h2>Already built your portfolio in Framer?</h2>
          <p>
            Once it&apos;s live on Framer, convert it to a self-hosted Next.js project or clean
            static HTML — faster load times, no Framer runtime, and no monthly hosting fee.
          </p>
          <div className="page-btn-row">
            <Link href="/" className="page-btn is-sm">
              Convert to Next.js →
            </Link>
            <Link href="/" className="page-btn is-ghost is-sm">
              Convert to static HTML →
            </Link>
          </div>
        </div>

        <section className="page-section is-compact">
          <h2>Free portfolio website — FAQ</h2>
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

      {pageJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </main>
  );
}
