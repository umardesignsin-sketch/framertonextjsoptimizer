import type { Metadata } from "next";
import Link from "next/link";
import { jsonLdScript, SITE } from "@/lib/site-meta";

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

interface Template {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  previewUrl: string;
  getUrl: string;
  categories: string[];
  features: string[];
}

const TEMPLATES: Template[] = [
  {
    slug: "portfolie",
    name: "Portfolie",
    tagline: "Agency Portfolio Template",
    description:
      "A premium agency portfolio template for creative agencies, digital agencies, design studios, and web development teams — homepage, project galleries, case studies, team, and testimonials, all responsive.",
    image: "https://image.mux.com/5zZ02SsZ2Zt637H02sLmFlCwQffexpSxdhIXweWaVsOWE/thumbnail.jpg?time=2",
    previewUrl: "https://portfolie.framer.website/",
    getUrl: "https://framer.link/ggmluKZ",
    categories: ["Agency", "Portfolio", "Consulting", "Free"],
    features: ["Appear Effects", "Scroll Effects", "CMS", "Forms", "Code Components"],
  },
  {
    slug: "photograph",
    name: "Photograph",
    tagline: "Free Photography Portfolio Template",
    description:
      "A sleek, modern template built specifically for photographers, photography studios, videographers, and content creators who need a clean, easy-to-customize portfolio.",
    image: "https://image.mux.com/Uj6giFQ01VBRXxaZJNeo01jqGfSHdXk5LnouUI01iCSjQk/thumbnail.jpg?time=2",
    previewUrl: "https://photograph.framer.media/",
    getUrl: "https://framer.link/cyRXHVw",
    categories: ["Personal", "Photography", "Portfolio", "Art & Design"],
    features: ["Appear Effects", "Scroll Effects", "CMS", "Forms", "Code Components"],
  },
  {
    slug: "portfolioz",
    name: "PortfolioZ",
    tagline: "Portfolio Template for Designers, Developers & Freelancers",
    description:
      "A modern portfolio template crafted for designers, developers, and freelancers who want a professional personal site without starting from a blank canvas.",
    image: "https://image.mux.com/ESvjhdOfZ1G2G3ywT3PEMEA7Ird6Zlfwx1VODROlbEs/thumbnail.jpg?time=2",
    previewUrl: "https://portfolioz.framer.ai/",
    getUrl: "https://framer.link/DUF18Uz",
    categories: ["Resume", "Agency", "Personal", "Free"],
    features: ["Appear Effects", "Scroll Effects", "CMS", "Layout Templates"],
  },
  {
    slug: "portfoliona",
    name: "Portfoliona",
    tagline: "Portfolio Website Template",
    description:
      "A clean portfolio website template for showcasing personal work, résumé-style project history, and a professional online presence.",
    image: "https://image.mux.com/IbR8LODgIyh00q00VFEAessfq01StnwBlBTHi016wVEFMCU/thumbnail.jpg?time=2",
    previewUrl: "https://portfoliona.framer.website/",
    getUrl: "https://framer.link/6uLAIxO",
    categories: ["Resume", "Personal", "Portfolio", "Free"],
    features: ["Appear Effects", "Scroll Effects", "CMS", "Forms", "Variable Fonts"],
  },
  {
    slug: "portfolioxo",
    name: "Portfolioxo",
    tagline: "Developer Portfolio Template",
    description:
      "A developer-focused portfolio template with a built-in blog layout — built for engineers and technical freelancers who want to showcase projects and writing together.",
    image: "https://image.mux.com/7yOmXqMPwRS9s01WKtzgEkTLYll2eIuHW4NtcN7xGnu4/thumbnail.jpg?time=2",
    previewUrl: "https://devfolio.framer.media/",
    getUrl: "https://framer.link/x52CtuV",
    categories: ["Resume", "Blog", "Portfolio", "Free"],
    features: ["Light & Dark Theme", "Scroll Effects", "CMS", "Custom Cursors"],
  },
  {
    slug: "furnitra",
    name: "Furnitra",
    tagline: "Free Business Website Template",
    description:
      "A clean, premium one-page template built for furniture, interior design, and professional service businesses that want a strong first impression without a long build.",
    image: "https://y4pdgnepgswqffpt.public.blob.vercel-storage.com/media/82da9c63-b526-4125-babc-4bfd13d6777c/qvbq61qx",
    previewUrl: "https://furnitra.framer.website/",
    getUrl: "https://framer.link/M2iOFKZ",
    categories: ["Landing Page", "Interior Design", "Professional Services"],
    features: ["Appear Effects", "Scroll Effects", "Rich Media", "Text Effects"],
  },
  {
    slug: "interiore",
    name: "Interiore",
    tagline: "Construction & Renovation Template",
    description:
      "A polished template for architecture, construction, and interior design businesses that need to present work and convert visitors into clients.",
    image: "https://y4pdgnepgswqffpt.public.blob.vercel-storage.com/media/82da9c63-b526-4125-babc-4bfd13d6777c/ksxj15z7",
    previewUrl: "https://interiore.framer.media/",
    getUrl: "https://framer.link/To5IjU6",
    categories: ["Architecture", "Construction", "Interior Design", "Free"],
    features: ["Appear Effects", "Sticky Scrolling", "CMS", "Custom Cursors", "Code Components"],
  },
  {
    slug: "saaset",
    name: "Saaset",
    tagline: "SaaS Landing Page Template",
    description:
      "A modern SaaS landing page template for startups, AI tools, and software products that want to launch fast with a conversion-focused web presence.",
    image: "https://y4pdgnepgswqffpt.public.blob.vercel-storage.com/templates/58486/saset-uyzs2E7dIOODOE5OQs8UOfk4SKZGlv",
    previewUrl: "https://saaset.framer.website/",
    getUrl: "https://framer.link/MK3qtf7",
    categories: ["SaaS", "Landing Page", "Free"],
    features: ["Appear Effects", "Scroll Effects", "Layout Templates", "Text Effects"],
  },
];

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
