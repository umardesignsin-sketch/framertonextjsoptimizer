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
    <div className="min-h-screen w-full">
      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="pt-14 pb-8">
          <nav className="text-[12.5px] text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link> ·{" "}
            <Link href="/templates" className="hover:text-foreground">Templates</Link> · Free Portfolio Website
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Build a free portfolio website
          </h1>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            {PORTFOLIO_TEMPLATES.length} real, published{" "}
            <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">
              Framer
            </a>{" "}
            portfolio templates — for designers, developers, photographers, and freelancers. Preview each
            live site, then remix it for free directly in Framer&apos;s editor. No signup required just to
            look.
          </p>
          <p className="mt-3 max-w-2xl text-[14px] text-muted-foreground">
            Looking for something outside portfolios — agency, SaaS, or business templates too? See the{" "}
            <Link href="/templates" className="text-foreground underline underline-offset-2">
              full template catalog
            </Link>
            .
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          {PORTFOLIO_TEMPLATES.map((t) => (
            <article
              key={t.slug}
              id={t.slug}
              className="overflow-hidden rounded-xl border border-border bg-background scroll-mt-20"
            >
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

        <section className="mt-16 rounded-xl border border-border bg-muted/40 p-6">
          <h2 className="text-xl font-semibold tracking-tight">Already built your portfolio in Framer?</h2>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            Once it&apos;s live on Framer, convert it to a self-hosted Next.js project or clean static HTML
            — faster load times, no Framer runtime, and no monthly hosting fee.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href="/nextjs"
              className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-[13.5px] font-medium text-background hover:opacity-90"
            >
              Convert to Next.js →
            </Link>
            <Link
              href="/framer-to-html"
              className="inline-flex h-10 items-center rounded-lg border border-border-strong px-4 text-[13.5px] font-medium hover:bg-muted"
            >
              Convert to static HTML →
            </Link>
          </div>
        </section>

        <section className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Free portfolio website — FAQ</h2>
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

      {pageJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </div>
  );
}
