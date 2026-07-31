import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonPage } from "@/components/ComparisonPage";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "FramerToNextJS vs ConvertFramer | Free vs Paid Framer to Next.js";
const DESCRIPTION =
  "Honest comparison of FramerToNextJS and ConvertFramer for converting Framer sites to Next.js: free URL-based conversion vs a paid, per-page .cfp upload workflow. Which fits you?";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/vs/convertframer" },
  openGraph: { type: "website", url: "/vs/convertframer", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const ROWS: [string, string, string][] = [
  ["Cost", "Free — converting, previewing, downloading, editing, and publishing all included.", "Paid: $15/page for automated conversion, or a custom quote for the Production Migration / Custom Rebuild tiers."],
  ["What you provide", "A public published Framer URL — nothing else needed.", "A .cfp file export, uploaded via a Chrome extension, behind a required free account."],
  ["Animations & interactions", "Appear/scroll-reveal animations rebuilt from Framer's own authored data (real spring physics), included in every conversion.", "Not included in the base automated tier — animation restoration is an added feature of the paid Production Migration tier."],
  ["Responsive behavior", "Preserves Framer's responsive breakpoints as part of the standard conversion.", "Not preserved by default in the automated tier — added only in the (custom-priced) Production Migration tier."],
  ["Live preview before committing", "Built-in — preview the converted site in-app before downloading or deploying.", "Not part of the automated workflow."],
  ["Deploy", "One-click to Netlify or Vercel with your own token, or download the project.", "Download the exported ZIP and deploy it yourself."],
  ["Edit after export", "Visual editor: change text, links, and images and publish to your live site.", "Not included — edit the exported code directly."],
  ["Turnaround", "Typically under a minute for a full multi-page conversion.", "Automated tier is fast; Production Migration is a 7–10 business day turnaround."],
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What's the core difference between FramerToNextJS and ConvertFramer?",
    a: "Price and workflow. ConvertFramer is a paid, per-page tool ($15/page for automated conversion, custom pricing for a fully-restored production migration) that requires uploading a .cfp file via a Chrome extension and a free account. FramerToNextJS is free end-to-end and works directly from a public Framer URL — no file export, no extension, no account needed to convert.",
  },
  {
    q: "Does ConvertFramer preserve animations and responsive design?",
    a: "Not in its base automated tier, based on ConvertFramer's own site — animation restoration and full responsiveness are described as part of the paid Production Migration tier, not the $15/page automated conversion. FramerToNextJS includes real, authored-data animation reproduction and responsive breakpoints in every conversion, free.",
  },
  {
    q: "Do I need a Framer file export to use either tool?",
    a: "ConvertFramer works from a .cfp file you export from Framer and upload via a Chrome extension. FramerToNextJS works directly from your site's public published URL — nothing to export or upload manually.",
  },
  {
    q: "Which is cheaper for a multi-page site?",
    a: "FramerToNextJS is free regardless of page count. ConvertFramer's automated tier charges per page ($15 each), so a 10-page site would run roughly $150 for the automated conversion alone, before any Production Migration add-ons for animations or full responsiveness.",
  },
  {
    q: "When would ConvertFramer's paid tiers make sense?",
    a: "If you specifically want a hands-on migration service — someone reviewing and rebuilding your site with a human-assisted process, custom-priced for complex animation-heavy projects — that's a different kind of offering than an automated converter, and ConvertFramer's Custom Rebuild tier is built for that use case specifically.",
  },
  {
    q: "Can I preview the result before paying or committing?",
    a: "FramerToNextJS includes a free, built-in live preview before you download or deploy anything. Check ConvertFramer's current site for whether a preview is available before their paid conversion runs.",
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
        { "@type": "ListItem", position: 2, name: "FramerToNextJS vs ConvertFramer", item: `${SITE.url}/vs/convertframer` },
      ],
    },
  ];
}

export default function VsConvertFramerPage() {
  return (
    <>
      <ComparisonPage
        crumb="ConvertFramer"
        title="FramerToNextJS vs ConvertFramer — free vs paid Framer to Next.js"
        lede={
          <>
            Short answer: <strong>ConvertFramer</strong> is a paid, per-page conversion service
            ($15/page automated, custom pricing for a fully-restored migration) built around
            uploading a Framer .cfp export. <strong>FramerToNextJS</strong> is free end-to-end and
            works directly from your <Link href="/">site&apos;s public URL</Link> — no file
            export, no extension, no account required to convert, with animation and
            responsive-breakpoint reproduction included rather than gated behind a paid tier. Both
            are legitimate tools solving the same underlying problem differently — check{" "}
            <a href="https://convertframer.com" target="_blank" rel="noopener noreferrer">
              convertframer.com
            </a>{" "}
            for their current pricing and features.
          </>
        }
        columns={["Dimension", "FramerToNextJS", "ConvertFramer"]}
        rows={ROWS}
        note="Comparison reflects publicly available information at the time of writing; ConvertFramer's features and pricing may change — verify on their site."
        chooseUs={{
          heading: "Choose FramerToNextJS if you…",
          items: [
            <>Want a <strong>free</strong> conversion, any page count</>,
            <>Only have the <strong>public URL</strong>, not a .cfp export</>,
            <>Need <strong>animations preserved</strong> without an upsell</>,
            <>Want to <strong>preview before</strong> downloading or deploying</>,
            <>Want one-click Netlify/Vercel deploys</>,
          ],
        }}
        chooseThem={{
          heading: "Choose ConvertFramer if you…",
          items: [
            <>Want a <strong>hands-on, human-assisted</strong> migration service</>,
            <>Have a complex, animation-heavy project worth a custom rebuild</>,
            <>Prefer a paid service with a dedicated turnaround window</>,
          ],
        }}
        faq={FAQ}
        cta={{
          heading: "Try it free on your own Framer site",
          body: "No file export, no account to upload — just paste your published URL and see the result.",
        }}
      />

      {vsJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </>
  );
}
