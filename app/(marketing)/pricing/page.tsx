import type { Metadata } from "next";
import Link from "next/link";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "Pricing | Free Framer to Next.js & HTML Converter";
const DESCRIPTION =
  "Simple, honest pricing: converting Framer sites to Next.js or static HTML is free. Preview, download, edit, and deploy with your own hosting account — no per-site fees.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { type: "website", url: "/pricing", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const INCLUDED: [string, string][] = [
  ["Hybrid HTML conversion", "Full site converted to an optimized static bundle — runtime stripped, WebP images, fonts inlined, SEO pass."],
  ["Pure Next.js export", "A real, deployable Next.js App Router project — one prerendered route per page."],
  ["Multi-page discovery", "Every public page converted, URL structure preserved."],
  ["Live preview", "Inspect the converted site before you deploy anything."],
  ["Project download (.zip)", "Take the files or the Next.js project anywhere."],
  ["One-click deploy", "Push to Netlify or Vercel using your own account token."],
  ["Visual editor + publish", "Edit text, links, and images across breakpoints and push changes to your live site."],
  ["PageSpeed comparison", "Real Lighthouse scores for original vs converted, desktop and mobile."],
  ["'Made in Framer' badge removal", "Removed automatically during conversion."],
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is the converter really free?",
    a: "Yes. Converting, previewing, downloading, editing, and publishing are free. You create a free account so your conversions are saved to a dashboard — that's it.",
  },
  {
    q: "So what do I pay for at all?",
    a: "Only your own hosting, and only if your host charges you. Netlify and Vercel both have generous free tiers that comfortably serve converted static sites, so most people pay nothing at all.",
  },
  {
    q: "How does this compare to paying for Framer hosting?",
    a: "Framer's paid plans start at roughly $5–$30+/month per site depending on tier. A converted static site on a free Netlify/Vercel tier costs $0/month — read the full breakdown in our Framer hosting cost guide.",
  },
  {
    q: "Are there per-site fees, export credits, or locked features?",
    a: "No. There are no per-export charges, no credits to buy, and no features held behind a paywall. Every conversion includes the full pipeline.",
  },
  {
    q: "What's the catch?",
    a: "There isn't one hiding in the pricing. The honest limitations are technical, not commercial: password-protected pages can't be converted (public URLs only), and highly runtime-dependent features are trimmed in HTML mode — the Next.js export keeps them.",
  },
];

function pricingJsonLd() {
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
        { "@type": "ListItem", position: 2, name: "Pricing", item: `${SITE.url}/pricing` },
      ],
    },
  ];
}

export default function PricingPage() {
  return (
    <div className="min-h-screen w-full">

      <main className="mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-14 pb-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Own your site instead of renting it</h1>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            Converting a Framer site to{" "}
            <Link href="/framer-to-html" className="text-foreground underline underline-offset-2">static HTML</Link>{" "}
            or a{" "}
            <Link href="/nextjs" className="text-foreground underline underline-offset-2">Next.js project</Link>{" "}
            is free: no per-site fees, no export credits, no paywalled features. The only cost in the whole
            setup is your own hosting — and free tiers on Netlify or Vercel handle converted sites easily.
            The real cost you&apos;re removing isn&apos;t ours; it&apos;s the Framer subscription you stop paying forever.
          </p>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-5">
            <div className="text-[12.5px] font-medium uppercase tracking-wide text-muted-foreground">Staying on Framer</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">$5–30+<span className="text-[14px] font-normal text-muted-foreground">/mo, forever</span></div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              Paid every month you keep the site live, on every site you run. Locked into Framer&apos;s editor and hosting the whole time.
            </p>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-5">
            <div className="text-[12.5px] font-medium uppercase tracking-wide text-accent">Converting once</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">$0<span className="text-[14px] font-normal text-muted-foreground"> + your own free hosting</span></div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              A real project you own outright. Deploy it anywhere Next.js or static HTML runs — no recurring fee tied to us or to Framer.
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border">
          <div className="border-b border-border bg-foreground/5 px-6 py-5">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight">$0</span>
              <span className="text-[14px] text-muted-foreground">everything included</span>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {INCLUDED.map(([title, desc]) => (
              <li key={title} className="flex gap-3 px-6 py-3.5">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <div>
                  <div className="text-[14.5px] font-medium">{title}</div>
                  <div className="text-[13px] text-muted-foreground">{desc}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-6 py-5">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-lg bg-foreground px-6 text-[15px] font-medium text-background hover:opacity-90"
            >
              Convert your site free →
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing FAQ</h2>
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
          <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground">
            Wondering what staying on Framer costs instead? See the{" "}
            <Link href="/blog/framer-hosting-cost" className="text-foreground underline underline-offset-2">Framer hosting cost breakdown</Link>{" "}
            and how the exports compare in the{" "}
            <Link href="/vs/nocodexport" className="text-foreground underline underline-offset-2">export tools comparison</Link>.
          </p>
        </section>
      </main>

      {pricingJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </div>
  );
}
