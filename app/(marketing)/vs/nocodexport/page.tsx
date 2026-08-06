import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonPage } from "@/components/ComparisonPage";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "FramerToNextJS vs NoCodeXport | Best Framer Export Tool";
const DESCRIPTION =
  "Honest comparison of FramerToNextJS and NoCodeXport for exporting Framer sites: HTML ZIP export vs a real Next.js project + performance pipeline. Which fits you?";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/vs/nocodexport" },
  openGraph: { type: "website", url: "/vs/nocodexport", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const ROWS: [string, string, string][] = [
  ["Primary output", "Real Next.js App Router project (one prerendered route per page) OR an optimized static HTML bundle — your choice per conversion.", "Static HTML ZIP export."],
  ["Platforms covered", "Framer only — the whole pipeline is built around how Framer publishes sites.", "Multiple no-code builders (Framer among them)."],
  ["Performance work", "Framer runtime stripped (HTML mode), images self-hosted + re-encoded to WebP, fonts inlined, appear/scroll animations rebuilt in CSS.", "Exports the site as-is; optimization depth varies — verify on their site."],
  ["SEO handling", "Automatic SEO pass: canonicals repointed to your domain, meta/OG preserved, alt text, invalid hreflang removed, badge stripped.", "Meta tags carried over with the export."],
  ["Measure the result", "Built-in PageSpeed comparison — original vs converted, desktop + mobile, real Lighthouse.", "Not built in — test manually with PageSpeed Insights."],
  ["Edit after export", "Visual editor: change text, links, and images across breakpoints and publish to your live site.", "Edit the exported files yourself."],
  ["Deploy", "One-click to Netlify or Vercel with your own token, or download the project/bundle.", "Download the ZIP and upload to your host."],
  ["Cost", "Free — converting, previewing, downloading, editing, and publishing.", "Check nocodexport.com for current pricing."],
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What's the core difference between FramerToNextJS and NoCodeXport?",
    a: "Output and depth. NoCodeXport is a multi-platform tool that exports no-code sites as static HTML ZIPs. FramerToNextJS is Framer-only and goes further: it can produce a real, deployable Next.js project or a performance-optimized HTML bundle (runtime stripped, WebP images, SEO pass), plus a visual editor and one-click deploy.",
  },
  {
    q: "Which is the best Framer export tool?",
    a: "It depends on what you need. If you want one tool that covers several no-code platforms with simple HTML ZIPs, NoCodeXport's breadth is the draw. If you're exporting a Framer site specifically and care about Lighthouse scores, real Next.js code, editing after export, or one-click deploys, FramerToNextJS is purpose-built for exactly that.",
  },
  {
    q: "Is FramerToNextJS a NoCodeXport alternative?",
    a: "Yes — for Framer sites. It covers the same core job (get your site out of the builder) and adds a Next.js code export, a performance/SEO pipeline, a built-in speed comparison, and a post-export visual editor. It does not export Webflow or other builders.",
  },
  {
    q: "Do both tools work without my Framer login?",
    a: "FramerToNextJS works from your public published URL only — no login or API key. NoCodeXport also works from published URLs. Neither should ever need your builder password.",
  },
  {
    q: "Which produces faster sites?",
    a: "Run the comparison yourself — that's what the built-in PageSpeed checker is for. FramerToNextJS's HTML mode strips Framer's runtime and optimizes assets, which typically lands Lighthouse Performance at 90–100 on desktop and SEO at 100 on fresh conversions. An as-is HTML export keeps whatever the original shipped.",
  },
  {
    q: "When should I choose NoCodeXport instead?",
    a: "If you need to export from multiple different no-code platforms with one tool, or you specifically want a plain ZIP of several builders' sites, a multi-platform exporter makes sense. For Framer-only work with performance and code requirements, this tool is the deeper fit.",
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
        { "@type": "ListItem", position: 2, name: "FramerToNextJS vs NoCodeXport", item: `${SITE.url}/vs/nocodexport` },
      ],
    },
  ];
}

export default function VsNoCodeXportPage() {
  return (
    <>
      <ComparisonPage
        crumb="NoCodeXport"
        title="FramerToNextJS vs NoCodeXport — which Framer export tool?"
        lede={
          <>
            Short answer: <strong>NoCodeXport</strong> is a multi-platform exporter that turns
            no-code sites into static HTML ZIPs. <strong>FramerToNextJS</strong> is a Framer
            specialist that exports either a real <Link href="/">Next.js project</Link> or a
            performance-optimized <Link href="/">HTML bundle</Link> — with an SEO pass,
            a built-in <Link href="/speed">PageSpeed comparison</Link>, and a visual editor after
            export. Both are legitimate tools; they solve different depths of the same problem. This
            comparison is honest about that — check{" "}
            <a href="https://nocodexport.com" target="_blank" rel="noopener noreferrer">
              nocodexport.com
            </a>{" "}
            for their current features and pricing.
          </>
        }
        columns={["Dimension", "FramerToNextJS", "NoCodeXport"]}
        rows={ROWS}
        note="Comparison reflects publicly available information at the time of writing; NoCodeXport's features and pricing may change — verify on their site."
        chooseUs={{
          heading: "Choose FramerToNextJS if you…",
          items: [
            <>Are exporting a <strong>Framer</strong> site specifically</>,
            <>Want real <strong>Next.js code</strong>, not just files</>,
            <>Care about <strong>Lighthouse / Core Web Vitals</strong></>,
            <>Want to <strong>edit and publish</strong> after exporting</>,
            <>Want one-click Netlify/Vercel deploys</>,
          ],
        }}
        chooseThem={{
          heading: "Choose NoCodeXport if you…",
          items: [
            <>Need exports from <strong>multiple no-code platforms</strong></>,
            <>Just want a simple <strong>HTML ZIP</strong> of your site</>,
            <>Don&apos;t need a code project or optimization pipeline</>,
          ],
        }}
        faq={FAQ}
        cta={{
          heading: "Try it on your own Framer site",
          body: "Free conversion, live preview, and a real Lighthouse comparison — judge the output yourself.",
        }}
      />

      {vsJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </>
  );
}
