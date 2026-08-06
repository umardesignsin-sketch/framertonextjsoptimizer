import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonPage } from "@/components/ComparisonPage";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "Framer vs Webflow (2026): Which Should You Actually Build On?";
const DESCRIPTION =
  "An honest comparison of Framer and Webflow for building a site in 2026 — pricing, CMS depth, code export, and what to do if you built in Framer and want a self-hosted site.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/vs/webflow" },
  openGraph: { type: "website", url: "/vs/webflow", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const ROWS: [string, string, string][] = [
  [
    "Pricing",
    "Free, Basic ($10/mo), Pro ($30/mo) — one price per site, no separate seat pricing for a single owner.",
    "Free Starter, Basic ($15/mo), Premium ($25/mo) site plans — plus separate Workspace seat pricing on top ($39/mo per full seat, $15/mo per content-editor seat) once more than one person needs access.",
  ],
  [
    "Code export",
    "Not offered natively — no built-in way to export to self-hosted HTML.",
    "Offered, but only on paid Workspace plans, and only as static HTML — you lose CMS, forms, and e-commerce, since those only run on Webflow's own hosting.",
  ],
  [
    "CMS depth",
    "Collection limits scale by plan (from a handful on lower tiers up to more generous limits on Pro).",
    "Premium's CMS is genuinely large by default — 20,000 items across 40 collections — a real advantage for big, content-heavy sites.",
  ],
  [
    "Learning curve",
    "Leans toward simplicity — fewer panels, faster to a finished page.",
    "More powerful and more complex — a mature 'Interactions' panel and deeper layout control, with a steeper learning curve to match.",
  ],
  [
    "Team pricing",
    "No per-seat cost for a single site owner working alone.",
    "Seats add up fast for a team — a small team can end up paying more for Workspace seats than for the site plan itself.",
  ],
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can I export code from Framer the way I can from Webflow?",
    a: "No — Framer doesn't offer native code export. Webflow does, but only on paid Workspace plans, and only as static HTML that loses CMS, forms, and e-commerce once it's off Webflow's hosting. This tool covers the Framer side of that gap for free: paste a published Framer URL and get a real Next.js project or static HTML bundle, no paid plan required.",
  },
  {
    q: "Is Framer or Webflow cheaper for a solo site?",
    a: "Framer, usually — its site plans don't require separate seat pricing for a single owner. Webflow's site-plan pricing is comparable, but once you factor in Workspace seats for any collaborator, the total climbs faster than Framer's.",
  },
  {
    q: "Which has better animations?",
    a: "Both are strong here and it's genuinely close — Webflow's Interactions panel is mature and deep; Framer leans more on React-component and code-embed extensibility for the same kind of effects. Neither is a clear structural winner; it comes down to which editing model you prefer.",
  },
  {
    q: "Which is better for a large, content-heavy site?",
    a: "Webflow's Premium CMS tier (20,000 items, 40 collections) is genuinely more generous by default than Framer's collection limits at comparable price points, if a large content library is your main requirement.",
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
        { "@type": "ListItem", position: 2, name: "Framer vs Webflow", item: `${SITE.url}/vs/webflow` },
      ],
    },
  ];
}

export default function VsWebflowPage() {
  return (
    <>
      <ComparisonPage
        crumb="Webflow"
        title="Framer vs Webflow — which should you actually build on?"
        lede={
          <>
            Both are modern, visual, no-code site builders — this isn&apos;t a &ldquo;real tool vs
            toy&rdquo; comparison like Framer vs WordPress. The real differences are in CMS depth,
            team pricing, and code export: <strong>Webflow</strong> offers more generous CMS limits
            and (on paid plans) static code export; <strong>Framer</strong> is usually cheaper for a
            solo builder since it doesn&apos;t charge separate Workspace seats.
          </>
        }
        columns={["Dimension", "Framer", "Webflow"]}
        rows={ROWS}
        note="Pricing and features reflect publicly available information at the time of writing and change often on both sides — verify current numbers before deciding."
        chooseUs={{
          heading: "Choose Framer if you…",
          items: [
            <>Are building and maintaining the site <strong>solo</strong></>,
            <>Want the <strong>simpler</strong> editing model of the two</>,
            <>Don&apos;t need a huge CMS content library</>,
          ],
        }}
        chooseThem={{
          heading: "Choose Webflow if you…",
          items: [
            <>Need a <strong>large, content-heavy CMS</strong></>,
            <>Want the option to <strong>export static code</strong> (paid plans)</>,
            <>Prefer Webflow&apos;s deeper Interactions/layout control</>,
          ],
        }}
        faq={FAQ}
        ctaPlacement="beforeFaq"
        cta={{
          heading: "Built in Framer, want a self-hosted site?",
          body: (
            <>
              Framer doesn&apos;t offer Webflow&apos;s paid code-export option — so this tool covers
              that gap, for free. Paste your published Framer URL and get a real, self-hosted{" "}
              <Link href="/">Next.js project</Link> or{" "}
              <Link href="/">static HTML bundle</Link>.
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
