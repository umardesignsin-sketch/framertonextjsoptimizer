import type { Metadata } from "next";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";
import { jsonLdScript, SITE } from "@/lib/site-meta";

// Primary money page for: "framer to html converter"
// Also targets: framer to html, export framer to html, convert framer to html,
// free framer html converter, framer html export tool

const TITLE = "Framer to HTML Converter — Free Export Tool (2026)";
const DESCRIPTION =
  "Free Framer to HTML converter: paste any published Framer URL and get a clean static HTML/CSS/JS ZIP in about a minute. No plugin, no Framer login — self-host on Vercel, Netlify, or anywhere.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "Framer to HTML converter",
    "framer to html",
    "export framer to html",
    "convert framer to html",
    "framer html export",
    "free framer to html converter",
    "export framer site",
    "framer static html",
    "framer html export tool",
  ],
  alternates: { canonical: "/framer-to-html" },
  openGraph: {
    type: "website",
    url: "/framer-to-html",
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE.name,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is a Framer to HTML converter?",
    a: "A Framer to HTML converter is a tool that takes a published Framer website URL and turns it into portable static HTML, CSS, JavaScript, and image files you can host anywhere. Framer does not offer official HTML export, so a converter is how you leave Framer hosting without rebuilding the site by hand.",
  },
  {
    q: "Can you export HTML from Framer?",
    a: "No — not with Framer itself. Framer’s own help docs confirm published sites rely on their platform and cannot be exported as standalone HTML. This free Framer to HTML converter fills that gap by capturing the rendered public pages and packaging them as a clean static bundle.",
  },
  {
    q: "Is this Framer to HTML converter free?",
    a: "Yes. Converting a Framer site to HTML and previewing the result is free — create an account so conversions save to your dashboard. Deploying uses your own free Netlify or Vercel account. There is no per-site export fee.",
  },
  {
    q: "How does the Framer to HTML converter work?",
    a: "Paste your public Framer URL. The tool discovers every page, captures the server-rendered HTML, strips Framer’s heavy runtime, re-encodes images to self-hosted WebP, inlines fonts, removes the Made in Framer badge, runs an SEO pass, and returns a downloadable ZIP (or one-click deploy).",
  },
  {
    q: "Do my animations and interactions survive the HTML export?",
    a: "Appear and scroll animations are preserved — recreated with lightweight CSS and IntersectionObserver instead of Framer’s full runtime. Complex runtime-only effects (custom cursors, WebGL) may be simplified in HTML mode for speed. Need pixel-perfect runtime fidelity? Use the Pure Next.js export instead.",
  },
  {
    q: "Where can I host the exported HTML?",
    a: "Anywhere that serves static files: Netlify, Vercel, GitHub Pages, Cloudflare Pages, Amazon S3, or classic shared hosting. No build step and no Node server required for the HTML export.",
  },
  {
    q: "Will a Framer to HTML converter make my site faster?",
    a: "Usually yes. Removing Framer’s JavaScript runtime, self-hosting WebP images, and inlining fonts typically lifts Lighthouse Performance toward 90–100 on desktop, with SEO, Best Practices, and Accessibility often at 95–100. Compare your own site with our PageSpeed checker.",
  },
  {
    q: "Does it convert multi-page Framer sites to HTML?",
    a: "Yes. It discovers every published page — including nested routes like /work/project — converts each to HTML, and preserves your URL structure so existing links keep working.",
  },
  {
    q: "Is the Made in Framer badge removed?",
    a: "Yes. The Framer to HTML converter strips the Made in Framer badge automatically during the SEO pass, along with runtime code that would re-inject it.",
  },
  {
    q: "Do I need my Framer login or API key?",
    a: "No. The converter only uses your public published URL. It never asks for your Framer account, password, or API key, and it cannot access private drafts or password-protected pages.",
  },
  {
    q: "Will my Google rankings drop after HTML export?",
    a: "Usually not — often they improve. Titles, descriptions, and URL structure are preserved; canonicals are pointed at your deploy domain; pages load faster (better Core Web Vitals). Keep the same paths (automatic) and add 301s only if you change domains.",
  },
  {
    q: "Framer to HTML converter vs NoCodeXport — what’s different?",
    a: "Both can get a Framer site out as files. This Framer to HTML converter is Framer-focused: it optimizes for speed (runtime strip, WebP, font inlining, SEO pass), includes a PageSpeed comparison tool, a visual editor after export, and also offers a real Next.js project export. See the full comparison on our vs NoCodeXport page.",
  },
  {
    q: "Framer to HTML vs Framer to Next.js — which should I pick?",
    a: "Pick the Framer to HTML converter when you want the fastest static site and simple hosting. Pick Framer to Next.js when you need a real App Router codebase with exact Framer runtime fidelity. You can run both and compare.",
  },
  {
    q: "What if a page fails to convert?",
    a: "The rest of the site still converts. A single failed fetch does not abort the job. Re-run free anytime; the pipeline log shows what happened per page.",
  },
];

const STEPS: { name: string; text: string }[] = [
  {
    name: "Publish your Framer site",
    text: "Your site must be live on a public URL (your-site.framer.website or a custom domain). Private drafts cannot be converted.",
  },
  {
    name: "Paste the URL into the Framer to HTML converter",
    text: "Drop the published URL into the form and start conversion. No Framer plugin, no code, no API key.",
  },
  {
    name: "Optimizer builds clean static HTML",
    text: "Every page is captured, Framer runtime is stripped, images become self-hosted WebP, fonts are inlined, badge is removed, SEO tags are cleaned.",
  },
  {
    name: "Download the ZIP or deploy live",
    text: "Get a static HTML bundle, or push to Netlify/Vercel in one click. Edit text, links, and images later in the visual editor.",
  },
];

function softwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Framer to HTML Converter",
    alternateName: [
      "Framer HTML Converter",
      "Export Framer to HTML",
      "Framer to HTML tool",
    ],
    url: `${SITE.url}/framer-to-html`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description: DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Convert Framer sites to static HTML",
      "Multi-page site discovery",
      "Remove Made in Framer badge",
      "WebP image optimization",
      "Font inlining and SEO pass",
      "One-click deploy to Netlify and Vercel",
      "Visual editor after export",
    ],
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
  };
}

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function howToJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to use a Framer to HTML converter",
    description:
      "Convert any published Framer website into a free static HTML bundle with this Framer to HTML converter.",
    totalTime: "PT2M",
    tool: [{ "@type": "HowToTool", name: "Framer to HTML Converter" }],
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${SITE.url}/framer-to-html#step-${i + 1}`,
    })),
  };
}

function breadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Framer to HTML Converter",
        item: `${SITE.url}/framer-to-html`,
      },
    ],
  };
}

function webPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE.url}/framer-to-html`,
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    about: {
      "@type": "Thing",
      name: "Framer to HTML conversion",
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${SITE.url}/opengraph-image`,
    },
  };
}

export default function FramerToHtmlPage() {
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
              Framer to HTML
            </Link>
            <Link href="/nextjs" className="text-muted-foreground hover:text-foreground">
              Pure Next.js
            </Link>
            <Link href="/speed" className="text-muted-foreground hover:text-foreground">
              PageSpeed
            </Link>
            <Link href="/vs/nocodexport" className="text-muted-foreground hover:text-foreground">
              vs NoCodeXport
            </Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        {/* Hero — exact primary keyword in H1 */}
        <section className="pt-14 pb-8">
          <nav className="text-[12.5px] text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            {" · "}
            <span className="text-foreground">Framer to HTML Converter</span>
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Framer to HTML Converter
          </h1>
          <p className="mt-2 text-[17px] font-medium text-foreground">
            Free online tool to convert any Framer website to clean static HTML
          </p>
          <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
            Looking for a <strong className="text-foreground">Framer to HTML converter</strong>? Framer
            does not let you export your site as HTML. This free converter does: paste any published{" "}
            <a
              href="https://www.framer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Framer
            </a>{" "}
            URL and get a portable HTML/CSS/JS ZIP you own — design preserved,{" "}
            <strong className="text-foreground">Made in Framer badge removed</strong>, images as self-hosted{" "}
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types#webp_image"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              WebP
            </a>
            , runtime stripped for{" "}
            <a
              href="https://developer.chrome.com/docs/lighthouse/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Lighthouse
            </a>{" "}
            scores that beat Framer hosting. Host on Vercel, Netlify, Cloudflare, or any static host.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
            {[
              "Free Framer to HTML converter",
              "No login to Framer required",
              "Multi-page export",
              "~1 minute",
              "SEO pass included",
            ].map((t) => (
              <li
                key={t}
                className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground"
              >
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Converter — above the fold CTA */}
        <section
          id="convert"
          className="rounded-xl border border-border bg-background p-5 shadow-sm scroll-mt-24"
        >
          <h2 className="text-[15px] font-semibold">
            Use the free Framer to HTML converter now
          </h2>
          <p className="mb-3 mt-1 text-[13px] text-muted-foreground">
            Paste your published Framer site URL (e.g.{" "}
            <code className="text-[12px]">https://yoursite.framer.website</code>). Free · no plugin · no
            credit card.
          </p>
          <UrlFunnelForm cta="Convert Framer to HTML →" />
        </section>

        {/* Definition block for AEO / featured snippets */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            What is a Framer to HTML converter?
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            A <strong className="text-foreground">Framer to HTML converter</strong> turns a live Framer
            website into standard web files — HTML pages, CSS, scripts, and images — so you can self-host
            outside Framer. Officially,{" "}
            <a
              href="https://www.framer.com/help/articles/can-i-export-my-website-to-html-and-self-host-it/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Framer does not support HTML export for self-hosting
            </a>
            . Converters work by reading the same public HTML visitors already receive, then packaging and
            optimizing it for portable hosting.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            People search for this tool when they want to{" "}
            <strong className="text-foreground">export a Framer site to HTML</strong>, cut hosting costs,
            remove vendor lock-in, improve Core Web Vitals, or hand a client a site they fully own.
          </p>
        </section>

        {/* Why */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Why use this Framer to HTML converter?
          </h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">Built for the exact keyword job.</strong> Paste URL → get
              static HTML. No generic multi-builder detour if all you need is Framer → HTML.
            </li>
            <li>
              <strong className="text-foreground">Faster than Framer hosting.</strong> The converter strips
              Framer’s client runtime. Typical desktop Lighthouse Performance lands in the 90–100 range;
              measure your site with the{" "}
              <Link href="/speed" className="text-foreground underline underline-offset-2">
                PageSpeed checker
              </Link>
              .
            </li>
            <li>
              <strong className="text-foreground">Own the files forever.</strong> ZIP of HTML/CSS/assets —
              host for free on Netlify or Vercel. No monthly Framer plan required to keep the marketing site
              online. See{" "}
              <Link
                href="/guides/self-host-framer"
                className="text-foreground underline underline-offset-2"
              >
                how to self-host a Framer site
              </Link>
              .
            </li>
            <li>
              <strong className="text-foreground">SEO pass included.</strong> Meta tags preserved,
              canonicals rewritten for your deploy domain, missing image alts filled, badge removed,{" "}
              <code className="text-[13px]">lang</code> and viewport ensured.
            </li>
            <li>
              <strong className="text-foreground">Edit after export.</strong> Visual editor for text, links,
              and images across breakpoints — publish without going back to Framer.
            </li>
          </ul>
        </section>

        {/* How to */}
        <section className="mt-14" id="how-to">
          <h2 className="text-2xl font-semibold tracking-tight">
            How to convert Framer to HTML (4 steps)
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            This is the full workflow for anyone searching{" "}
            <em>how to export Framer to HTML</em> or <em>how to use a Framer to HTML converter</em>:
          </p>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <li
                key={s.name}
                id={`step-${i + 1}`}
                className="scroll-mt-24 rounded-xl border border-border bg-background p-4"
              >
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

        {/* Related searches / semantic coverage */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Export Framer to HTML — what people mean by related searches
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13.5px]">
              <thead className="border-b border-border bg-foreground/5 text-left text-[12.5px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Search intent</th>
                  <th className="px-4 py-2.5 font-medium">What this converter does</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">framer to html converter</td>
                  <td className="px-4 py-3">Primary tool on this page — free URL → HTML ZIP</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">export framer to html</td>
                  <td className="px-4 py-3">Full multi-page export with assets, not a single “Save as”</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">convert framer website to html</td>
                  <td className="px-4 py-3">Discovers all routes and preserves path structure</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">free framer html export</td>
                  <td className="px-4 py-3">Convert + preview free; host on free static tiers</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">remove made in framer badge</td>
                  <td className="px-4 py-3">
                    Automatic — also see{" "}
                    <Link
                      href="/guides/remove-made-in-framer-badge"
                      className="text-foreground underline"
                    >
                      badge guide
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">self host framer</td>
                  <td className="px-4 py-3">
                    HTML export is the path —{" "}
                    <Link href="/guides/self-host-framer" className="text-foreground underline">
                      self-host guide
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Comparison methods */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Best way to get HTML out of Framer (compared)
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13.5px]">
              <thead className="border-b border-border bg-foreground/5 text-left text-[12.5px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Method</th>
                  <th className="px-4 py-2.5 font-medium">Effort</th>
                  <th className="px-4 py-2.5 font-medium">Assets</th>
                  <th className="px-4 py-2.5 font-medium">Multi-page</th>
                  <th className="px-4 py-2.5 font-medium">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">Browser “Save page” / view-source</td>
                  <td className="px-4 py-3">High, per page</td>
                  <td className="px-4 py-3">Often still on Framer CDN</td>
                  <td className="px-4 py-3">Manual</td>
                  <td className="px-4 py-3">Runtime still loads</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Rebuild in HTML/CSS by hand</td>
                  <td className="px-4 py-3">Days–weeks</td>
                  <td className="px-4 py-3">You manage all</td>
                  <td className="px-4 py-3">If you build it</td>
                  <td className="px-4 py-3">Depends on rebuild</td>
                </tr>
                <tr className="bg-emerald-50/40">
                  <td className="px-4 py-3 font-medium text-foreground">
                    This Framer to HTML converter
                  </td>
                  <td className="px-4 py-3">~1 minute</td>
                  <td className="px-4 py-3">Self-hosted WebP + fonts</td>
                  <td className="px-4 py-3">Automatic</td>
                  <td className="px-4 py-3">Runtime stripped · 90–100 target</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <Link href="/nextjs" className="underline">
                      Framer to Next.js export
                    </Link>
                  </td>
                  <td className="px-4 py-3">~1 minute</td>
                  <td className="px-4 py-3">Exact original assets</td>
                  <td className="px-4 py-3">Automatic</td>
                  <td className="px-4 py-3">Full fidelity (runtime kept)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <Link href="/vs/nocodexport" className="underline">
                      Generic HTML exporters (e.g. NoCodeXport)
                    </Link>
                  </td>
                  <td className="px-4 py-3">Minutes</td>
                  <td className="px-4 py-3">Varies by tool</td>
                  <td className="px-4 py-3">Usually yes</td>
                  <td className="px-4 py-3">Often as-is export</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Bundle contents */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            What you get from the Framer to HTML converter
          </h2>
          <ul className="mt-4 grid gap-2 text-[14.5px] leading-relaxed text-muted-foreground sm:grid-cols-2">
            <li>✓ One clean <code>.html</code> file per page</li>
            <li>✓ Self-hosted WebP images</li>
            <li>✓ Fonts inlined (fewer requests)</li>
            <li>✓ Appear &amp; scroll animations in CSS</li>
            <li>✓ SEO pass: meta, alt, canonical, lang</li>
            <li>✓ Original URL structure preserved</li>
            <li>✓ No Framer runtime · no build step</li>
            <li>✓ One-click deploy to Netlify or Vercel</li>
            <li>✓ Made in Framer badge removed</li>
            <li>✓ Visual editor for post-export edits</li>
          </ul>
        </section>

        {/* Limitations — trust + AEO */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Limitations (honest)
          </h2>
          <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">Public pages only.</strong> Password-protected or draft
              pages cannot be converted.
            </li>
            <li>
              <strong className="text-foreground">Static snapshot.</strong> Server-side Framer CMS updates
              after export require a new conversion (or edit content in the visual editor / HTML files).
            </li>
            <li>
              <strong className="text-foreground">Heavy interactions.</strong> Some advanced Framer effects
              are simplified in HTML mode for performance — use{" "}
              <Link href="/nextjs" className="text-foreground underline underline-offset-2">
                Next.js export
              </Link>{" "}
              for full runtime fidelity.
            </li>
            <li>
              <strong className="text-foreground">Own sites only.</strong> Only convert websites you own or
              have permission to export.
            </li>
          </ul>
        </section>

        {/* Related guides cluster */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Related guides</h2>
          <ul className="mt-4 space-y-2 text-[15px]">
            <li>
              <Link
                href="/guides/self-host-framer"
                className="font-medium text-foreground underline underline-offset-2"
              >
                Self-host a Framer site
              </Link>
              <span className="text-muted-foreground"> — leave Framer hosting after HTML export</span>
            </li>
            <li>
              <Link
                href="/guides/remove-made-in-framer-badge"
                className="font-medium text-foreground underline underline-offset-2"
              >
                Remove the Made in Framer badge
              </Link>
              <span className="text-muted-foreground"> — automatic with this converter</span>
            </li>
            <li>
              <Link
                href="/export-framer-site"
                className="font-medium text-foreground underline underline-offset-2"
              >
                How to export a Framer site
              </Link>
              <span className="text-muted-foreground"> — full export options explained</span>
            </li>
            <li>
              <Link href="/nextjs" className="font-medium text-foreground underline underline-offset-2">
                Convert Framer to Next.js
              </Link>
              <span className="text-muted-foreground"> — when you need a real codebase</span>
            </li>
            <li>
              <Link
                href="/vs/nocodexport"
                className="font-medium text-foreground underline underline-offset-2"
              >
                FramerToNextJS vs NoCodeXport
              </Link>
              <span className="text-muted-foreground"> — pick the right export tool</span>
            </li>
            <li>
              <Link
                href="/blog/framer-to-html-converter"
                className="font-medium text-foreground underline underline-offset-2"
              >
                Blog: Framer to HTML converter guide
              </Link>
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="mt-14" id="faq">
          <h2 className="text-2xl font-semibold tracking-tight">
            Framer to HTML converter — FAQ
          </h2>
          <div className="mt-5 divide-y divide-border rounded-xl border border-border">
            {FAQ.map((f, i) => (
              <details key={f.q} className="group px-4" open={i < 2}>
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

        {/* Bottom CTA */}
        <section className="mt-14 rounded-xl border border-border bg-muted/40 p-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Convert your Framer site to HTML free
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
            The Framer to HTML converter takes about a minute. Measure the speed win immediately with
            PageSpeed.
          </p>
          <div className="mx-auto mt-4 max-w-lg">
            <UrlFunnelForm cta="Start Framer to HTML conversion →" />
          </div>
          <p className="mt-4 text-[12.5px] text-muted-foreground">
            Prefer code?{" "}
            <Link href="/nextjs" className="underline underline-offset-2">
              Framer to Next.js converter
            </Link>
            {" · "}
            <Link href="/pricing" className="underline underline-offset-2">
              Pricing (free)
            </Link>
          </p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-foreground text-[11px] font-bold text-background">
              F
            </span>
            <span>Framer to HTML Converter · {SITE.name}</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/framer-to-html" className="hover:text-foreground">
              Framer to HTML
            </Link>
            <Link href="/export-framer-site" className="hover:text-foreground">
              Export Framer site
            </Link>
            <Link href="/nextjs" className="hover:text-foreground">
              Next.js
            </Link>
            <Link href="/speed" className="hover:text-foreground">
              PageSpeed
            </Link>
            <Link href="/vs/nocodexport" className="hover:text-foreground">
              vs NoCodeXport
            </Link>
            <Link href="/blog" className="hover:text-foreground">
              Blog
            </Link>
          </nav>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(softwareJsonLd()) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd()) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(howToJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(webPageJsonLd()) }}
      />
    </div>
  );
}
