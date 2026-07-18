import type { Metadata } from "next";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "Remove the Made in Framer Badge | Free Methods";
const DESCRIPTION =
  "How to remove the 'Made in Framer' badge: upgrade to a paid Framer plan, or export your site to HTML/Next.js — the badge is stripped automatically and hosting is free.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/guides/remove-made-in-framer-badge" },
  openGraph: { type: "website", url: "/guides/remove-made-in-framer-badge", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "How do I remove the 'Made in Framer' badge?",
    a: "Two real options: pay for a Framer site plan (the badge is a free-plan feature), or export your site — this converter removes the badge automatically during conversion, and the exported site can be hosted free on Netlify or Vercel.",
  },
  {
    q: "Can I remove the badge for free while staying on Framer?",
    a: "No — not legitimately. On Framer's free plan the badge is part of the deal, and hiding it with CSS or scripts violates Framer's terms and tends to break as Framer re-injects it. The free route that actually works is exporting the site off Framer hosting.",
  },
  {
    q: "Does the converter really strip the badge?",
    a: "Yes. The SEO pass removes the badge element and the runtime code that re-injects it. Your exported site ships clean — verified on every conversion.",
  },
  {
    q: "Is removing the badge from an exported site allowed?",
    a: "Yes. Once your site is exported and hosted on your own infrastructure, it's your own static files — Framer's badge requirement applies to sites on Framer's free hosting, not to self-hosted exports of your own work.",
  },
  {
    q: "What does it cost each way?",
    a: "Staying on Framer: a paid site plan (recurring, per site). Exporting: the conversion is free and free hosting tiers (Netlify, Vercel, Cloudflare Pages) serve converted sites at $0/month.",
  },
  {
    q: "Will exporting change how my site looks?",
    a: "No — the export preserves your design, fonts, and breakpoints. The HTML mode also makes it faster (runtime stripped, WebP images); the Next.js mode keeps everything pixel-identical.",
  },
];

function badgeJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Remove the Made in Framer badge", item: `${SITE.url}/guides/remove-made-in-framer-badge` },
      ],
    },
  ];
}

export default function RemoveBadgeGuide() {
  return (
    <div className="min-h-screen w-full">

      <main className="mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-14 pb-8">
          <nav className="text-[12.5px] text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link> · Guides · Remove the badge
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            How to remove the &ldquo;Made in Framer&rdquo; badge
          </h1>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            There are exactly <strong className="text-foreground">two legitimate ways</strong> to remove the
            &ldquo;Made in Framer&rdquo; badge: pay for a Framer site plan, or export your site off Framer
            hosting. This converter takes the second route — the badge (and the runtime that re-injects it)
            is <strong className="text-foreground">stripped automatically</strong> during conversion, and the
            exported site hosts free on Netlify or Vercel.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Your options, honestly compared</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13.5px]">
              <thead className="border-b border-border bg-foreground/5 text-left text-[12.5px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Method</th>
                  <th className="px-4 py-2.5 font-medium">Works?</th>
                  <th className="px-4 py-2.5 font-medium">Cost</th>
                  <th className="px-4 py-2.5 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 font-medium">Upgrade to a paid Framer plan</td>
                  <td className="px-4 py-3">Yes</td>
                  <td className="px-4 py-3">Recurring, per site</td>
                  <td className="px-4 py-3 text-muted-foreground">Simplest if you want to stay on Framer hosting.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Hide it with custom CSS/JS</td>
                  <td className="px-4 py-3">No</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3 text-muted-foreground">Violates Framer&apos;s terms; the runtime re-injects the badge. Don&apos;t.</td>
                </tr>
                <tr className="bg-emerald-50/40">
                  <td className="px-4 py-3 font-medium">Export the site (this tool)</td>
                  <td className="px-4 py-3">Yes</td>
                  <td className="px-4 py-3">Free</td>
                  <td className="px-4 py-3 text-muted-foreground">Badge removed automatically; site hosts free anywhere; also faster.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">The export route in practice</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Paste your published URL into the{" "}
            <Link href="/framer-to-html" className="text-foreground underline underline-offset-2">Framer to HTML converter</Link>{" "}
            (or the <Link href="/nextjs" className="text-foreground underline underline-offset-2">Next.js export</Link>).
            During the SEO pass the badge element and its re-injection code are removed, images are
            re-encoded to WebP, and canonicals are pointed at your domain. Deploy the result to Netlify or
            Vercel in one click, point your domain, and you&apos;re badge-free — with a faster site and no
            monthly Framer bill. Full walkthrough in the{" "}
            <Link href="/guides/self-host-framer" className="text-foreground underline underline-offset-2">self-hosting guide</Link>.
          </p>
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
          <h2 className="text-xl font-semibold tracking-tight">Remove the badge the free way</h2>
          <div className="mx-auto mt-4 max-w-lg">
            <UrlFunnelForm cta="Convert badge-free →" />
          </div>
        </section>
      </main>

      {badgeJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </div>
  );
}
