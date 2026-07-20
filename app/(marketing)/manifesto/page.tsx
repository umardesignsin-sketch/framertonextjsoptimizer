import type { Metadata } from "next";
import Link from "next/link";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "Our Manifesto | Framer → Next.js Optimizer";
const DESCRIPTION =
  "Your site is not a subscription. Why we believe in real code over lock-in, pixel-perfect fidelity, and telling you the truth even when it doesn't help our pitch.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/manifesto" },
  openGraph: { type: "website", url: "/manifesto", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const ARTICLES: { title: string; body: string }[] = [
  {
    title: "Your site is not a subscription.",
    body: "You built it, you designed every pixel, you sweat the animations — and then you rent it back from the platform that hosted it, forever, at $5, $15, $30 a month, for as long as it exists. That's not hosting. That's a lease with no end date. We think that's backwards.",
  },
  {
    title: "Code is the only thing you actually own.",
    body: "A visual editor is a tool you're borrowing. A .tsx file on your own machine, in your own repo, deployable to any host on earth — that's yours. No export button that “sort of works.” No subscription that silently expires into a dead site. Real code, or it doesn't count.",
  },
  {
    title: "Pixel-perfect is not negotiable.",
    body: "We tried the shortcut once — reverse-engineer the design, rebuild it in “cleaner” code, hope nobody notices the drift. Nobody should ship that to you. If your hover state, your scroll animation, your exact 4px of padding doesn't survive the conversion, we failed. Fidelity isn't a nice-to-have. It's the whole deal.",
  },
  {
    title: "We will tell you when something doesn't help.",
    body: "We converted 10 real templates and measured the honest result: performance didn't improve on most of them. We could have hidden that. We published it instead — with the real numbers, the real template names, the real Lighthouse scores. If we ever have to choose between a good story and a true one, we publish the true one.",
  },
  {
    title: "Accessibility isn't a checkbox. It's a bug we fix by default.",
    body: "Every Framer export we've ever tested ships without a lang attribute, without titled iframes, without a landmark, without a name on the icon that links to your homepage. Nobody asked for that to be broken. We fix it automatically, every time, whether you noticed it was missing or not.",
  },
  {
    title: "Fast is a choice you make on purpose, not a lie we tell you by default.",
    body: "Want your site to fly? Strip the runtime, rebuild it lean — we'll show you the real before/after. Want it to look and move exactly like you designed it? Keep the runtime, own the code, accept that fidelity has a weight. Both are honest answers. Only one of them is right for you, and we won't pretend otherwise to make a sale.",
  },
  {
    title: "You shouldn't need our permission to leave.",
    body: "The moment you download the project, we're done being necessary. No lock-in, no re-up, no dependency on us staying in business for your site to keep working. If the best version of our product is the one where you never have to think about us again — good. That was the point.",
  },
];

function manifestoJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Own it. Ship it. Never rent it again.",
      description: DESCRIPTION,
      url: `${SITE.url}/manifesto`,
      publisher: { "@type": "Organization", name: "Framer → Next.js Optimizer" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Manifesto", item: `${SITE.url}/manifesto` },
      ],
    },
  ];
}

export default function ManifestoPage() {
  return (
    <div className="min-h-screen w-full">
      <main className="mx-auto max-w-2xl px-5 pb-24">
        <section className="pt-16 pb-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-[12px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            The Manifesto
          </div>
          <h1 className="mt-5 text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
            Own it. Ship it.
            <br />
            <span className="bg-gradient-to-br from-accent to-[#8b5cf6] bg-clip-text text-transparent">
              Never rent it again.
            </span>
          </h1>
        </section>

        <section className="mt-12 space-y-10">
          {ARTICLES.map((a, i) => (
            <div key={a.title} className="border-t border-border pt-8 first:border-t-0 first:pt-0">
              <div className="text-[12px] font-mono font-medium text-accent">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h2 className="mt-2 text-[21px] font-semibold leading-snug tracking-tight sm:text-[24px]">
                {a.title}
              </h2>
              <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-2xl border border-border bg-muted/30 p-8 text-center">
          <p className="text-[15.5px] leading-relaxed text-muted-foreground">
            None of this is a sales page. It&apos;s what we actually believe, backed by the tests we ran and
            published, including the ones that didn&apos;t flatter us.{" "}
            <Link href="/blog/does-converting-framer-to-next-js-make-it-faster-10-real-templates-tested" className="text-foreground underline underline-offset-2">
              Read the honest results
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
              href="/nextjs"
              className="inline-flex h-11 items-center rounded-full border border-border-strong px-6 text-[14px] font-medium transition-colors hover:bg-muted"
            >
              Own it as real Next.js code
            </Link>
          </div>
        </section>
      </main>

      {manifestoJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </div>
  );
}
