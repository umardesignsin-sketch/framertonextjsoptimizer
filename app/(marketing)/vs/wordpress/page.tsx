import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonPage } from "@/components/ComparisonPage";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "Framer vs WordPress (2026): Which Should You Actually Build On?";
const DESCRIPTION =
  "An honest comparison of Framer and WordPress for building a site in 2026 — pricing, maintenance burden, ownership, and what actually happens if you build in Framer and want to leave later.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/vs/wordpress" },
  openGraph: { type: "website", url: "/vs/wordpress", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const ROWS: [string, string, string][] = [
  [
    "Pricing",
    "All-inclusive: Free ($0), Basic ($10/mo), Pro ($30/mo) — design, hosting, and CMS bundled in one price.",
    "The software is free, but the real cost is hosting ($3–$450/mo depending on tier), a theme, and plugins — realistically $50–$1,500+/year, and renewal pricing after year one is often much higher than the intro rate.",
  ],
  [
    "Getting started",
    "Visual, no-code editor — design and publish without touching a server or a config file.",
    "More setup: choose hosting, install WordPress, pick a theme, configure plugins. A steeper first-hour, more control after that.",
  ],
  [
    "Ownership",
    "Hosted on Framer's platform. Exporting to self-hosted code isn't offered natively.",
    "Self-hosted from day one — you own the server, the files, and the database outright, with no platform dependency to begin with.",
  ],
  [
    "Maintenance",
    "Fully managed — no plugin updates, no security patching, no server to maintain.",
    "Ongoing responsibility: core updates, plugin updates, and security patching are on you (or whoever you pay to handle it).",
  ],
  [
    "Ecosystem",
    "A curated plugin/code-component marketplace — smaller, more consistent quality.",
    "Enormous plugin ecosystem — a plugin exists for nearly anything (e-commerce via WooCommerce, membership, forums), at the cost of more variable quality and compatibility risk.",
  ],
  [
    "Performance",
    "Consistent by default — Framer controls the hosting stack end to end.",
    "Highly variable — a well-configured WordPress site on good hosting can be very fast; a plugin-heavy site on cheap shared hosting often isn't.",
  ],
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is Framer or WordPress cheaper?",
    a: "Framer's sticker price looks higher per month, but it's genuinely all-inclusive. WordPress's software is free, but hosting, a decent theme, and the plugins most real sites need typically add up to $50–$1,500+/year — and hosting renewal prices often jump well above the first-year rate. Compare total cost, not just the headline number.",
  },
  {
    q: "Which is easier for a non-technical founder?",
    a: "Framer, by a wide margin, for the initial build and ongoing edits — it's a visual editor with no server or plugin management involved. WordPress rewards technical comfort (or a budget to hire it out) with far more customization depth in return.",
  },
  {
    q: "Can I export a Framer site to something as portable as WordPress?",
    a: "Framer itself doesn't offer that — no native export to self-hosted code. That's the specific problem this tool solves: paste your published Framer URL and get a real, self-hosted Next.js project or static HTML bundle, free, which gets you WordPress-style ownership without giving up the design you built in Framer.",
  },
  {
    q: "Which has better SEO?",
    a: "Both can rank well. WordPress has a deeper SEO-plugin ecosystem (Yoast and similar) built over two decades; Framer ships solid built-in SEO controls (canonical tags, structured data, sitemaps) without needing a plugin at all. Neither is a structural disadvantage on its own — execution matters more than platform here.",
  },
  {
    q: "What about e-commerce?",
    a: "WordPress, via WooCommerce, has the deeper, more mature e-commerce ecosystem if you need complex catalog or inventory logic. Framer handles simpler storefronts and payment integrations well but isn't built for that level of commerce complexity.",
  },
];

function vsJsonLd() {
  return [
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
        { "@type": "ListItem", position: 2, name: "Framer vs WordPress", item: `${SITE.url}/vs/wordpress` },
      ],
    },
  ];
}

export default function VsWordPressPage() {
  return (
    <>
      <ComparisonPage
        crumb="WordPress"
        title="Framer vs WordPress — which should you actually build on?"
        lede={
          <>
            Short answer: <strong>Framer</strong> is faster to start, fully managed, and priced
            all-in — good for a marketing site, portfolio, or small business site you want live fast
            with zero maintenance. <strong>WordPress</strong> gives you full self-hosted ownership
            and a vastly larger plugin ecosystem from day one, at the cost of more setup and ongoing
            maintenance. Neither is universally better — it depends on whether you value
            speed-to-launch or long-term customization depth more.
          </>
        }
        columns={["Dimension", "Framer", "WordPress"]}
        rows={ROWS}
        note="Pricing and features reflect publicly available information at the time of writing and change often on both sides — verify current numbers before deciding."
        chooseUs={{
          heading: "Choose Framer if you…",
          items: [
            <>Want to <strong>launch fast</strong> without touching hosting or servers</>,
            <>Don&apos;t want ongoing <strong>plugin/security maintenance</strong></>,
            <>Are building a marketing site, portfolio, or small business site</>,
            <>Value a clean, predictable all-in-one price</>,
          ],
        }}
        chooseThem={{
          heading: "Choose WordPress if you…",
          items: [
            <>Want <strong>full self-hosted ownership</strong> from day one</>,
            <>Need deep customization via plugins (complex e-commerce, membership, forums)</>,
            <>Have the technical comfort — or budget — for ongoing maintenance</>,
            <>Are fine trading setup time for long-term flexibility</>,
          ],
        }}
        faq={FAQ}
        ctaPlacement="beforeFaq"
        cta={{
          heading: "Built in Framer, want WordPress-style ownership?",
          body: (
            <>
              You don&apos;t have to choose between Framer&apos;s design experience and
              WordPress&apos;s self-hosted ownership. Paste your published Framer URL and get a real,
              self-hosted <Link href="/">Next.js project</Link> or{" "}
              <Link href="/">static HTML bundle</Link> — free, keeping the design you
              built while gaining the portability WordPress offers by default.
            </>
          ),
        }}
      />

      {vsJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </>
  );
}
