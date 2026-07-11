import type { Metadata } from "next";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";
import { jsonLdScript, SITE } from "@/lib/site-meta";

// SEO landing page for the primary keyword "framer to html".
// Fully server-rendered: every word is in the HTML Google crawls.

const TITLE = "Framer to HTML: Convert a Framer Site to Static HTML (Free)";
const DESCRIPTION =
  "Convert any published Framer site to clean, fast static HTML in about a minute. Free Framer to HTML converter — keeps your design and animations, self-hosts images as WebP, and hands you a bundle you can host anywhere.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/framer-to-html" },
  openGraph: {
    type: "website",
    url: "/framer-to-html",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can you export HTML from Framer?",
    a: "Framer itself doesn't offer a built-in HTML export — published sites live on Framer's hosting. To get HTML out, you either copy the rendered source by hand or use a converter. This tool automates it: paste your published Framer URL and it captures every page as clean static HTML with optimized assets.",
  },
  {
    q: "Is this Framer to HTML converter free?",
    a: "Yes. Converting a Framer site to HTML and previewing the result is free — you just create an account so your conversions are saved to a dashboard. Deploying uses your own free Netlify or Vercel account.",
  },
  {
    q: "Do my animations and interactions survive the HTML export?",
    a: "Appear and scroll animations are preserved — the converter re-creates them with a lightweight CSS + IntersectionObserver layer instead of Framer's heavy runtime. Complex runtime interactions (custom cursors, WebGL effects) are trimmed in HTML mode for speed; if you need 100% runtime fidelity, use the Pure Next.js export instead.",
  },
  {
    q: "Where can I host the exported HTML?",
    a: "Anywhere that serves static files: Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, or classic shared hosting. The output is plain HTML, CSS, and images with no build step and no server requirements — one-click deploy to Netlify or Vercel is built in.",
  },
  {
    q: "Will converting Framer to HTML make my site faster?",
    a: "Almost always, yes. Removing Framer's JavaScript runtime, converting images to self-hosted WebP, and inlining fonts typically lifts Lighthouse Performance to 90–100 on desktop, with SEO, Best Practices, and Accessibility at 95–100. You can measure it yourself with the built-in PageSpeed checker.",
  },
  {
    q: "Does it convert multi-page Framer sites to HTML?",
    a: "Yes. It discovers every page of a published Framer site — including nested routes like /work/project — converts each one to HTML, and preserves your URL structure so existing links keep working.",
  },
  {
    q: "Can I edit the HTML after converting?",
    a: "Yes, two ways: the downloaded bundle is plain HTML you can edit in any editor, and the built-in visual editor lets you change text, links, and images across Desktop, Tablet, and Phone breakpoints, then publish straight to your live site.",
  },
  {
    q: "What's the difference between Framer to HTML and Framer to Next.js?",
    a: "HTML (Hybrid) output is the fastest: a static bundle with the Framer runtime stripped, built for top Lighthouse scores. The Pure Next.js export produces a real Next.js App Router project that keeps Framer's runtime for pixel-perfect fidelity. Choose HTML for speed and simple hosting, Next.js for real code and exact behavior.",
  },
];

const STEPS: { name: string; text: string }[] = [
  {
    name: "Publish your Framer site",
    text: "Make sure your site is published on a public URL, like https://your-site.framer.website or your custom domain.",
  },
  {
    name: "Paste the URL into the converter",
    text: "Drop your published Framer URL into the converter and click Convert. It crawls every page — no plugin, no code, nothing to install.",
  },
  {
    name: "Let the optimizer run",
    text: "The converter captures the server-rendered HTML, strips Framer's JavaScript runtime, re-encodes images to self-hosted WebP, inlines fonts, and runs an SEO pass — usually in under a minute.",
  },
  {
    name: "Download or deploy your HTML",
    text: "Download the static bundle as a .zip, or push it live to Netlify or Vercel in one click. You can keep editing text, links, and images in the visual editor afterwards.",
  },
];

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
    name: "How to convert a Framer site to HTML",
    description:
      "Convert any published Framer website into a fast static HTML bundle in four steps, using a free online converter.",
    totalTime: "PT2M",
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

function breadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Framer to HTML", item: `${SITE.url}/framer-to-html` },
    ],
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
            <Link href="/" className="text-muted-foreground hover:text-foreground">Hybrid converter</Link>
            <Link href="/nextjs" className="text-muted-foreground hover:text-foreground">Pure Next.js</Link>
            <Link href="/speed" className="text-muted-foreground hover:text-foreground">PageSpeed checker</Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        {/* Hero */}
        <section className="pt-14 pb-8">
          <nav className="text-[12.5px] text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link> · Framer to HTML
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Framer to HTML — convert your Framer site to clean, fast static HTML
          </h1>
          <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
            <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Framer</a>{" "}
            is a brilliant design tool, but it has no built-in HTML export — your site lives on Framer&apos;s
            hosting, running Framer&apos;s JavaScript. This free <strong>Framer to HTML converter</strong> takes
            any published Framer URL and returns a static HTML bundle: your exact design, no runtime,
            self-hosted{" "}
            <a href="https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types#webp_image" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">WebP</a>{" "}
            images, inlined fonts, and{" "}
            <a href="https://developer.chrome.com/docs/lighthouse/overview" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Lighthouse</a>{" "}
            scores that are hard to hit on Framer hosting — hostable anywhere that serves files.
          </p>
        </section>

        {/* Converter funnel */}
        <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold">Convert a Framer site to HTML now</h2>
          <p className="mb-3 mt-1 text-[13px] text-muted-foreground">
            Paste your published Framer URL — the converter opens with it ready to run. Free, ~1 minute, no
            plugin.
          </p>
          <UrlFunnelForm cta="Convert to HTML →" />
        </section>

        {/* Why */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Why export Framer to HTML?</h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">Speed.</strong> Framer sites ship a large JavaScript runtime
              that re-renders the page after load. Static HTML skips all of it — typical results are
              Performance 90–100 on desktop and big gains in{" "}
              <a href="https://web.dev/articles/vitals" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Core Web Vitals</a>{" "}
              like LCP and CLS.
            </li>
            <li>
              <strong className="text-foreground">Host anywhere, own everything.</strong> The bundle is plain
              HTML, CSS, and images. Put it on Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, or any
              shared host — no Framer subscription required to keep the site online.
            </li>
            <li>
              <strong className="text-foreground">SEO.</strong> Every page is fully rendered HTML with correct
              meta tags, alt attributes, and canonical links (the converter runs an SEO pass automatically).
              Crawlers get content instantly instead of waiting on JavaScript.
            </li>
            <li>
              <strong className="text-foreground">Design intact.</strong> This is a capture of your real
              published site, not a rebuild — layouts, fonts, and responsive breakpoints match, and appear /
              scroll animations are re-created with lightweight CSS.
            </li>
          </ul>
        </section>

        {/* How to */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">How to convert Framer to HTML (4 steps)</h2>
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

        {/* Comparison */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Ways to get HTML out of Framer, compared</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13.5px]">
              <thead className="border-b border-border bg-foreground/5 text-left text-[12.5px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Method</th>
                  <th className="px-4 py-2.5 font-medium">Effort</th>
                  <th className="px-4 py-2.5 font-medium">Assets &amp; images</th>
                  <th className="px-4 py-2.5 font-medium">Multi-page</th>
                  <th className="px-4 py-2.5 font-medium">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">Right-click → Save page / copy source</td>
                  <td className="px-4 py-3">High, per page</td>
                  <td className="px-4 py-3">Still load from Framer&apos;s CDN; break if unpublished</td>
                  <td className="px-4 py-3">Manual, page by page</td>
                  <td className="px-4 py-3">Same as Framer (runtime included)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Rebuild the site by hand in HTML/CSS</td>
                  <td className="px-4 py-3">Days to weeks</td>
                  <td className="px-4 py-3">You manage everything</td>
                  <td className="px-4 py-3">Yes, if you build it</td>
                  <td className="px-4 py-3">As good as your rebuild</td>
                </tr>
                <tr className="bg-emerald-50/40">
                  <td className="px-4 py-3 font-medium">This converter (Hybrid HTML)</td>
                  <td className="px-4 py-3">~1 minute, automatic</td>
                  <td className="px-4 py-3">Self-hosted, re-encoded to WebP, fonts inlined</td>
                  <td className="px-4 py-3">All pages, URL structure preserved</td>
                  <td className="px-4 py-3">Runtime stripped — built for 90–100 Lighthouse</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <Link href="/nextjs" className="underline">Pure Next.js export</Link>
                  </td>
                  <td className="px-4 py-3">~1 minute, automatic</td>
                  <td className="px-4 py-3">Framer CDN (exact original assets)</td>
                  <td className="px-4 py-3">All pages, one route each</td>
                  <td className="px-4 py-3">Same as original (full fidelity)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            Want to see the difference on your own site? Run both and{" "}
            <Link href="/speed" className="text-foreground underline underline-offset-2">
              compare Lighthouse scores side by side
            </Link>{" "}
            — the checker uses the same engine as{" "}
            <a href="https://pagespeed.web.dev" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">PageSpeed Insights</a>.
          </p>
        </section>

        {/* What you get */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">What&apos;s inside the HTML bundle</h2>
          <ul className="mt-4 grid gap-2 text-[14.5px] leading-relaxed text-muted-foreground sm:grid-cols-2">
            <li>✓ One clean <code>.html</code> file per page</li>
            <li>✓ Images self-hosted and re-encoded to WebP</li>
            <li>✓ Fonts inlined — no external font requests</li>
            <li>✓ Appear &amp; scroll animations in pure CSS</li>
            <li>✓ SEO pass: meta, alt text, canonical, lang</li>
            <li>✓ Original URL structure preserved</li>
            <li>✓ No Framer runtime, no framework, no build step</li>
            <li>✓ One-click deploy to Netlify or Vercel</li>
          </ul>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">
            After converting, a built-in visual editor lets you change text, links, and images across
            Desktop, Tablet, and Phone breakpoints and publish straight to your live site — no Framer, no
            code. If you&apos;d rather have a real codebase than static files, the{" "}
            <Link href="/nextjs" className="text-foreground underline underline-offset-2">Framer to Next.js export</Link>{" "}
            gives you a deployable App Router project instead.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Framer to HTML — FAQ</h2>
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

        {/* Bottom CTA */}
        <section className="mt-14 rounded-xl border border-border bg-muted/40 p-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Ready to turn your Framer site into HTML?</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
            Free, takes about a minute, and you can measure the speed difference immediately.
          </p>
          <div className="mx-auto mt-4 max-w-lg">
            <UrlFunnelForm cta="Convert now →" />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-foreground text-[11px] font-bold text-background">F</span>
            <span>Framer → Next.js Optimizer</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-foreground">Hybrid converter</Link>
            <Link href="/framer-to-html" className="hover:text-foreground">Framer to HTML</Link>
            <Link href="/nextjs" className="hover:text-foreground">Pure Next.js</Link>
            <Link href="/speed" className="hover:text-foreground">PageSpeed checker</Link>
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
          </nav>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(howToJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd()) }} />
    </div>
  );
}
