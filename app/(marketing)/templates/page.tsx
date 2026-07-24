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
    <div className="min-h-screen w-full">

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="pt-14 pb-8">
          <nav className="text-[12.5px] text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link> · Templates
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Free Framer Templates
          </h1>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            Real, published{" "}
            <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Framer</a>{" "}
            templates by{" "}
            <a href="https://www.framer.com/@umar-mirza/?tab=marketplace" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Umar Mirza</a>{" "}
            — portfolio, agency, SaaS, and photography website templates you can preview live and remix
            for free, no signup required just to look. Already have a site built from one of these?{" "}
            <Link href="/nextjs" className="text-foreground underline underline-offset-2">Convert it to Next.js</Link>{" "}
            or{" "}
            <Link href="/framer-to-html" className="text-foreground underline underline-offset-2">clean static HTML</Link>{" "}
            once it&apos;s live.
          </p>
          <p className="mt-3 max-w-2xl text-[14px] text-muted-foreground">
            Specifically after a{" "}
            <Link href="/free-portfolio-website" className="text-foreground underline underline-offset-2">
              free portfolio website
            </Link>{" "}
            for yourself? See the portfolio-only shortlist.
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <article key={t.slug} id={t.slug} className="overflow-hidden rounded-xl border border-border bg-background scroll-mt-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.image}
                alt={`${t.name} — ${t.tagline}`}
                className="aspect-[16/10] w-full object-cover"
                loading="lazy"
              />
              <div className="p-5">
                <h2 className="text-[17px] font-semibold tracking-tight">{t.name}</h2>
                <p className="mt-0.5 text-[13.5px] font-medium text-muted-foreground">{t.tagline}</p>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">{t.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.categories.map((c) => (
                    <span key={c} className="rounded-full border border-border px-2.5 py-0.5 text-[11.5px] text-muted-foreground">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <a
                    href={t.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center rounded-lg border border-border-strong px-3.5 text-[13.5px] font-medium hover:bg-muted"
                  >
                    Live preview ↗
                  </a>
                  <a
                    href={t.getUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center rounded-lg bg-foreground px-3.5 text-[13.5px] font-medium text-background hover:opacity-90"
                  >
                    Get this template free →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-xl border border-border bg-muted/40 p-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Want more free Framer templates?</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
            See the full, up-to-date collection on the Framer Marketplace.
          </p>
          <a
            href="https://www.framer.com/@umar-mirza/?tab=marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-90"
          >
            View marketplace profile ↗
          </a>
        </section>

        <section className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Free Framer templates — FAQ</h2>
          <div className="mt-5 divide-y divide-border rounded-xl border border-border">
            {FAQ.map((f, i) => (
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

      {templatesJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </div>
  );
}
