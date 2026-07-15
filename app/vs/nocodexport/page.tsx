import type { Metadata } from "next";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";
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
  ["Pricing", "Free — converting, previewing, downloading, editing, and publishing. See the pricing page.", "Check nocodexport.com for current pricing."],
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
            <Link href="/" className="hover:text-foreground">Home</Link> · Comparisons · NoCodeXport
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            FramerToNextJS vs NoCodeXport — which Framer export tool?
          </h1>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            Short answer: <strong className="text-foreground">NoCodeXport</strong> is a multi-platform
            exporter that turns no-code sites into static HTML ZIPs.{" "}
            <strong className="text-foreground">FramerToNextJS</strong> is a Framer specialist that exports
            either a real{" "}
            <Link href="/nextjs" className="text-foreground underline underline-offset-2">Next.js project</Link>{" "}
            or a performance-optimized{" "}
            <Link href="/framer-to-html" className="text-foreground underline underline-offset-2">HTML bundle</Link>{" "}
            — with an SEO pass, a built-in{" "}
            <Link href="/speed" className="text-foreground underline underline-offset-2">PageSpeed comparison</Link>,
            and a visual editor after export. Both are legitimate tools; they solve different depths of the
            same problem. This comparison is honest about that — check{" "}
            <a href="https://nocodexport.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">nocodexport.com</a>{" "}
            for their current features and pricing.
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
                  <th className="px-4 py-2.5 font-medium">NoCodeXport</th>
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
            Comparison reflects publicly available information at the time of writing; NoCodeXport&apos;s
            features and pricing may change — verify on their site.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">When to choose which</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-5">
              <h3 className="text-[15px] font-semibold">Choose FramerToNextJS if you…</h3>
              <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-muted-foreground">
                <li>· Are exporting a <strong className="text-foreground">Framer</strong> site specifically</li>
                <li>· Want real <strong className="text-foreground">Next.js code</strong>, not just files</li>
                <li>· Care about <strong className="text-foreground">Lighthouse / Core Web Vitals</strong></li>
                <li>· Want to <strong className="text-foreground">edit and publish</strong> after exporting</li>
                <li>· Want one-click Netlify/Vercel deploys</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5">
              <h3 className="text-[15px] font-semibold">Choose NoCodeXport if you…</h3>
              <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-muted-foreground">
                <li>· Need exports from <strong className="text-foreground">multiple no-code platforms</strong></li>
                <li>· Just want a simple <strong className="text-foreground">HTML ZIP</strong> of your site</li>
                <li>· Don&apos;t need a code project or optimization pipeline</li>
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
          <h2 className="text-xl font-semibold tracking-tight">Try it on your own Framer site</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
            Free conversion, live preview, and a real Lighthouse comparison — judge the output yourself.
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
