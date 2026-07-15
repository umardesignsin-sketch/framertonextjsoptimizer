import type { Metadata } from "next";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";
import { jsonLdScript, SITE } from "@/lib/site-meta";

// Satellite page for: export framer site / how to export framer website
// Canonical stays here; strong internal link to /framer-to-html money page.

const TITLE = "How to Export a Framer Site (HTML & Next.js) — Free";
const DESCRIPTION =
  "Framer has no official export. Here’s how to export a Framer site to HTML or Next.js for free: convert your published URL, download a ZIP, and self-host anywhere.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "export framer site",
    "how to export framer website",
    "export framer to html",
    "framer export html",
    "can you export framer",
  ],
  alternates: { canonical: "/export-framer-site" },
  openGraph: {
    type: "website",
    url: "/export-framer-site",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can you export a Framer site?",
    a: "Not with Framer’s built-in tools. Framer does not offer HTML or full code export for published sites. You export using a third-party converter that reads your public URL and packages static HTML or a Next.js project.",
  },
  {
    q: "What is the easiest way to export a Framer website?",
    a: "Use a free Framer to HTML converter: paste the published site URL, wait about a minute, download the ZIP (or deploy to Netlify/Vercel). No Framer login or plugin required.",
  },
  {
    q: "Should I export Framer to HTML or Next.js?",
    a: "Export to HTML for the fastest static site and simple hosting. Export to Next.js when you want a real App Router codebase with full Framer runtime fidelity. Both start from the same published URL.",
  },
  {
    q: "Is exporting my Framer site free?",
    a: "Yes with this tool — convert, preview, and download free. Hosting can stay free on Netlify or Vercel free tiers for typical marketing sites.",
  },
];

const STEPS = [
  {
    name: "Publish the Framer project",
    text: "Only public pages can be exported. Confirm the site loads without login on framer.website or your custom domain.",
  },
  {
    name: "Choose HTML or Next.js",
    text: "HTML = portable static files + speed. Next.js = real code project + exact interactions.",
  },
  {
    name: "Run the converter",
    text: "Paste the URL into the Framer to HTML converter (or Next.js converter). Multi-page discovery is automatic.",
  },
  {
    name: "Download or deploy",
    text: "Get a ZIP, or push live. Point DNS at the new host when you’re ready to leave Framer hosting.",
  },
];

export default function ExportFramerSitePage() {
  return (
    <div className="min-h-screen w-full">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[13px] font-bold text-background">
              F
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Framer <span className="text-muted-foreground">→</span> Next.js Optimizer
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-[13px]">
            <Link href="/framer-to-html" className="font-medium text-foreground">
              Framer to HTML Converter
            </Link>
            <Link href="/nextjs" className="text-muted-foreground hover:text-foreground">
              Next.js
            </Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-14 pb-8">
          <nav className="text-[12.5px] text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            {" · "}
            Export Framer site
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            How to export a Framer site
          </h1>
          <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
            Framer is excellent for design — but{" "}
            <strong className="text-foreground">you cannot officially export a Framer site</strong> as HTML
            or a full project. If you need to leave Framer hosting, cut costs, or own portable files, you use
            a converter. The fastest free path is our{" "}
            <Link href="/framer-to-html" className="text-foreground font-medium underline underline-offset-2">
              Framer to HTML converter
            </Link>
            : paste a published URL and download clean static HTML.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold">Export Framer → HTML free</h2>
          <p className="mb-3 mt-1 text-[13px] text-muted-foreground">
            Opens the Framer to HTML converter with your URL ready.
          </p>
          <UrlFunnelForm cta="Export Framer site to HTML →" />
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Why Framer has no native export
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Published Framer sites depend on Framer’s hosting stack (optimization, dynamic features, badge).
            Their help center states HTML export for self-hosting is not supported. That is why “export
            Framer site” and “Framer to HTML converter” searches exist — third-party tools capture the
            public rendered output visitors already get.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Export options compared</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13.5px]">
              <thead className="border-b border-border bg-foreground/5 text-left text-[12.5px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Option</th>
                  <th className="px-4 py-2.5 font-medium">Best for</th>
                  <th className="px-4 py-2.5 font-medium">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-emerald-50/40">
                  <td className="px-4 py-3 font-medium">Framer to HTML converter</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Speed, static hosting, remove badge, leave Framer billing
                  </td>
                  <td className="px-4 py-3">
                    <Link href="/framer-to-html" className="underline">
                      Open tool
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Framer to Next.js</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Developers who want a real App Router project
                  </td>
                  <td className="px-4 py-3">
                    <Link href="/nextjs" className="underline">
                      Open tool
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Manual rebuild</td>
                  <td className="px-4 py-3 text-muted-foreground">Full redesign control, slowest</td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Steps to export your Framer website</h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.name} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
                    {i + 1}
                  </span>
                  {s.name}
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Export Framer site — FAQ</h2>
          <div className="mt-5 divide-y divide-border rounded-xl border border-border">
            {FAQ.map((f, i) => (
              <details key={f.q} className="group px-4" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-medium marker:content-none">
                  <span>{f.q}</span>
                  <span className="ml-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 pr-6 text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-xl border border-border bg-muted/40 p-6 text-center">
          <h2 className="text-xl font-semibold">Ready to export?</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Use the free{" "}
            <Link href="/framer-to-html" className="underline">
              Framer to HTML converter
            </Link>
            .
          </p>
          <div className="mx-auto mt-4 max-w-lg">
            <UrlFunnelForm cta="Export to HTML →" />
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to export a Framer site",
            description: DESCRIPTION,
            step: STEPS.map((s, i) => ({
              "@type": "HowToStep",
              position: i + 1,
              name: s.name,
              text: s.text,
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
              {
                "@type": "ListItem",
                position: 2,
                name: "Export Framer site",
                item: `${SITE.url}/export-framer-site`,
              },
            ],
          }),
        }}
      />
    </div>
  );
}
