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
    <>
      <main>
        <section className="page-head">
          <div className="page-head-box">
            <div className="page-head-row">
              <div className="page-head-stack">
                <span className="mktg-badge">The Manifesto</span>
                <h1 className="page-title">Own it. Ship it. Never rent it again.</h1>
              </div>
            </div>
          </div>
        </section>

        <div className="page-body is-narrow is-compact">
          <div className="page-articles">
            {ARTICLES.map((a, i) => (
              <article key={a.title} className="page-article">
                <span className="page-article-num">{String(i + 1).padStart(2, "0")}</span>
                <h2>{a.title}</h2>
                <p>{a.body}</p>
              </article>
            ))}
          </div>

          <section className="page-cta">
            <p>
              None of this is a sales page. It&apos;s what we actually believe, backed by the tests
              we ran and published, including the ones that didn&apos;t flatter us.{" "}
              <Link href="/blog/does-converting-framer-to-next-js-make-it-faster-10-real-templates-tested">
                Read the honest results
              </Link>
              .
            </p>
            <div className="page-btn-row">
              <Link href="/#convert" className="page-btn">
                Convert your site free →
              </Link>
              <Link href="/" className="page-btn is-ghost">
                Own it as real Next.js code
              </Link>
            </div>
          </section>
        </div>
      </main>

      {manifestoJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </>
  );
}
