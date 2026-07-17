import type { Metadata } from "next";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";
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
  ["Pricing", "Free — converting, previewing, downloading, editing, and publishing all included. See the pricing page.", "Paid: $15/page for automated conversion, or a custom quote for the Production Migration / Custom Rebuild tiers."],
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
    <div className="min-h-screen w-full">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[13px] font-bold text-background">F</span>
            <span className="text-[15px] font-semibold tracking-tight">
              Framer <span className="text-muted-foreground">→</span> Next.js Optimizer
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-[13px]">
            <Link href="/" className="text-muted-foreground hover:text-foreground">Hybrid converter</Link>
            <Link href="/nextjs" className="text-muted-foreground hover:text-foreground">Pure Next.js</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-14 pb-8">
          <nav className="text-[12.5px] text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link> · Comparisons · ConvertFramer
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            FramerToNextJS vs ConvertFramer — free vs paid Framer to Next.js
          </h1>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            Short answer: <strong className="text-foreground">ConvertFramer</strong> is a paid,
            per-page conversion service ($15/page automated, custom pricing for a fully-restored
            migration) built around uploading a Framer .cfp export.{" "}
            <strong className="text-foreground">FramerToNextJS</strong> is free end-to-end and works
            directly from your{" "}
            <Link href="/nextjs" className="text-foreground underline underline-offset-2">
              site&apos;s public URL
            </Link>
            {" "}— no file export, no extension, no account required to convert, with animation and
            responsive-breakpoint reproduction included rather than gated behind a paid tier. Both are
            legitimate tools solving the same underlying problem differently — check{" "}
            <a href="https://convertframer.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">
              convertframer.com
            </a>{" "}
            for their current pricing and features.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Side by side</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13.5px]">
              <thead className="border-b border-border bg-foreground/5 text-left text-[12.5px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Dimension</th>
                  <th className="px-4 py-2.5 font-medium">FramerToNextJS</th>
                  <th className="px-4 py-2.5 font-medium">ConvertFramer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ROWS.map(([dim, us, them]) => (
                  <tr key={dim}>
                    <td className="px-4 py-3 font-medium">{dim}</td>
                    <td className="px-4 py-3">{us}</td>
                    <td className="px-4 py-3 text-muted-foreground">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            Comparison reflects publicly available information at the time of writing;
            ConvertFramer&apos;s features and pricing may change — verify on their site.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">When to choose which</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-5">
              <h3 className="text-[15px] font-semibold">Choose FramerToNextJS if you…</h3>
              <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-muted-foreground">
                <li>· Want a <strong className="text-foreground">free</strong> conversion, any page count</li>
                <li>· Only have the <strong className="text-foreground">public URL</strong>, not a .cfp export</li>
                <li>· Need <strong className="text-foreground">animations preserved</strong> without an upsell</li>
                <li>· Want to <strong className="text-foreground">preview before</strong> downloading or deploying</li>
                <li>· Want one-click Netlify/Vercel deploys</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5">
              <h3 className="text-[15px] font-semibold">Choose ConvertFramer if you…</h3>
              <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-muted-foreground">
                <li>· Want a <strong className="text-foreground">hands-on, human-assisted</strong> migration service</li>
                <li>· Have a complex, animation-heavy project worth a custom rebuild</li>
                <li>· Prefer a paid service with a dedicated turnaround window</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
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

        <section className="mt-14 rounded-xl border border-border bg-muted/40 p-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Try it free on your own Framer site</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
            No file export, no account to upload — just paste your published URL and see the result.
          </p>
          <div className="mx-auto mt-4 max-w-lg">
            <UrlFunnelForm cta="Convert free →" />
          </div>
        </section>
      </main>

      {vsJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </div>
  );
}
