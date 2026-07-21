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
    <div className="min-h-screen w-full">
      <main className="mx-auto max-w-2xl px-5 pb-24">
        <section className="pt-16 pb-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-[12px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Roadmap
          </div>
          <h1 className="mt-5 text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
            What&apos;s shipped.
            <br />
            <span className="bg-gradient-to-br from-accent to-[#8b5cf6] bg-clip-text text-transparent">
              What&apos;s still being built.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15.5px] leading-relaxed text-muted-foreground">
            No vague &quot;coming soon.&quot; Here&apos;s what actually works today, and what we&apos;re
            building next — in the order we&apos;re building it.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-[13px] font-mono font-semibold uppercase tracking-wide text-muted-foreground">
            Shipped
          </h2>
          <div className="mt-4 space-y-8">
            {SHIPPED.map((item) => (
              <div key={item.title} className="border-t border-border pt-6 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{item.title}</h3>
                  <span className="mt-0.5 shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                    live
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-[13px] font-mono font-semibold uppercase tracking-wide text-muted-foreground">
            Next
          </h2>
          <div className="mt-4 space-y-8">
            {NEXT.map((item) => (
              <div key={item.title} className="border-t border-border pt-6 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{item.title}</h3>
                  <span className="mt-0.5 shrink-0 rounded-full border border-border-strong px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    building
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-border bg-muted/30 p-8 text-center">
          <p className="text-[15.5px] leading-relaxed text-muted-foreground">
            This page changes as the product does — no roadmap graveyard, no items that quietly never ship.
            For the principles behind these calls, read the{" "}
            <Link href="/manifesto" className="text-foreground underline underline-offset-2">
              manifesto
            </Link>
            .
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#convert"
              className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-[14px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Convert your site free →
            </Link>
            <Link
              href="/blog/does-converting-framer-to-next-js-make-it-faster-10-real-templates-tested"
              className="inline-flex h-11 items-center rounded-full border border-border-strong px-6 text-[14px] font-medium transition-colors hover:bg-muted"
            >
              Read the 10-template benchmark
            </Link>
          </div>
        </section>
      </main>

      {roadmapJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </div>
  );
}
