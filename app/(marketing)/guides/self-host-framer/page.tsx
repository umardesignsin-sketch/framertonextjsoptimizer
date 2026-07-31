import type { Metadata } from "next";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";
import { jsonLdScript, SITE } from "@/lib/site-meta";

const TITLE = "Self-Host a Framer Site | Move Off Framer Hosting";
const DESCRIPTION =
  "Yes, you can self-host a Framer website. Convert it to static HTML or Next.js, then host free on Netlify, Vercel, or Cloudflare — full guide with steps and costs.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/guides/self-host-framer" },
  openGraph: { type: "website", url: "/guides/self-host-framer", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const STEPS = [
  { name: "Convert your published site", text: "Paste your public Framer URL into the converter. Choose the HTML export for the fastest static bundle, or the Next.js export for a real code project." },
  { name: "Preview and download", text: "Check the live preview, then download the bundle (.zip) — or skip the download and deploy directly." },
  { name: "Deploy to your host", text: "One-click deploy to Netlify or Vercel with your own token, or drag the folder into Netlify Drop, Cloudflare Pages, GitHub Pages, or S3." },
  { name: "Point your domain", text: "Add your custom domain at the new host and update your DNS (usually one CNAME). Your Framer subscription is no longer needed to keep the site online." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can you self-host a Framer website?",
    a: "Yes. Framer doesn't offer code export itself, but you can convert the published site to static HTML or a Next.js project and host it anywhere — Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3, or classic shared hosting.",
  },
  {
    q: "Is self-hosting a Framer site free?",
    a: "Usually, yes. Converted static sites fit comfortably in Netlify's and Vercel's free tiers and Cloudflare Pages' free plan. The conversion itself is free too — so most self-hosted Framer sites cost $0/month.",
  },
  {
    q: "Do I keep my design and animations?",
    a: "Yes. The HTML export preserves your layout, fonts, and breakpoints, and rebuilds appear/scroll animations in CSS. The Next.js export keeps Framer's runtime for exact behavior, including complex interactions.",
  },
  {
    q: "What happens to my SEO when I move?",
    a: "The converter preserves titles, descriptions, and your URL structure, and points canonicals at your new domain. Keep the same domain and paths and rankings carry over; if you change domains, add 301 redirects from the old one.",
  },
  {
    q: "Can I still edit the site after leaving Framer?",
    a: "Yes — two ways. The exported files are plain HTML (or a normal Next.js codebase) you can edit directly, and the built-in visual editor lets you change text, links, and images and publish to your live site without touching code.",
  },
  {
    q: "What can't be self-hosted?",
    a: "Password-protected pages (the converter only reads public URLs) and Framer-hosted form backends — swap forms to a service like Formspree or Tally. Everything rendered on your public pages comes along.",
  },
];

function guideJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to self-host a Framer website",
      description: "Move a Framer site off Framer hosting: convert it to static HTML or Next.js and deploy it to Netlify, Vercel, or Cloudflare.",
      totalTime: "PT10M",
      step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
    },
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
        { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE.url}/guides/self-host-framer` },
        { "@type": "ListItem", position: 3, name: "Self-host Framer", item: `${SITE.url}/guides/self-host-framer` },
      ],
    },
  ];
}

export default function SelfHostFramerGuide() {
  return (
    <>
      <main>
        <section className="page-head">
          <div className="page-head-box">
            <div className="page-head-row">
              <div className="page-head-stack">
                <nav className="page-breadcrumb">
                  <Link href="/">Home</Link> · Guides · Self-host Framer
                </nav>
                <h1 className="page-title">How to self-host a Framer site</h1>
              </div>
            </div>
            <div className="page-head-row">
              <p className="page-intro is-wide">
                <strong>Yes — you can self-host a Framer website</strong>, even though Framer has no
                export button. The route: convert your published site to{" "}
                <Link href="/">static HTML</Link> or a{" "}
                <Link href="/">Next.js project</Link>, deploy it to a host you control, and
                point your domain there. Ten minutes end to end, and for most sites the ongoing cost
                is <strong>$0/month</strong> on{" "}
                <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer">Netlify</a>{" "}
                or <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</a>{" "}
                free tiers.
              </p>
            </div>
          </div>
        </section>

        <div className="page-body is-narrow is-compact">
          <section className="page-section is-compact">
            <h2>Why self-host at all?</h2>
            <div className="page-prose is-sm">
              <ul className="page-list">
                <li>
                  <strong>Cost.</strong>{" "}Framer&apos;s paid site plans bill per site, per month. A
                  converted static site on a free tier costs nothing to serve.
                </li>
                <li>
                  <strong>Ownership.</strong>{" "}Your site becomes plain files or a normal codebase — no
                  builder subscription required to keep it online, no lock-in.
                </li>
                <li>
                  <strong>Speed.</strong>{" "}The HTML export strips Framer&apos;s runtime and optimizes
                  images to WebP, which typically lifts Lighthouse Performance to 90–100 on desktop
                  and improves{" "}
                  <a href="https://web.dev/articles/vitals" target="_blank" rel="noopener noreferrer">
                    Core Web Vitals
                  </a>
                  .
                </li>
                <li>
                  <strong>Flexibility.</strong>{" "}Add server logic, integrate with your stack, or hand
                  the project to a developer — things a hosted builder can&apos;t offer.
                </li>
              </ul>
            </div>
          </section>

          <section className="page-section is-compact">
            <h2>The 4-step process</h2>
            <ol className="page-steps">
              {STEPS.map((s, i) => (
                <li key={s.name} className="page-step">
                  <span className="page-step-name">
                    <span className="page-step-num">{i + 1}</span>
                    {s.name}
                  </span>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="page-section is-compact">
            <h2>Where to host (all work)</h2>
            <div className="page-table-wrap">
              <table className="page-table">
                <thead>
                  <tr>
                    <th>Host</th>
                    <th>Free tier fits a converted site?</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Netlify</td><td>Yes</td><td>One-click deploy from this tool; drag-and-drop also works.</td></tr>
                  <tr><td>Vercel</td><td>Yes</td><td>One-click deploy; natural home for the Next.js export.</td></tr>
                  <tr><td>Cloudflare Pages</td><td>Yes</td><td>Unlimited static requests on the free plan.</td></tr>
                  <tr><td>GitHub Pages</td><td>Yes</td><td>Good for the HTML bundle; push the folder to a repo.</td></tr>
                  <tr><td>S3 / shared hosting</td><td>Cheap</td><td>Any host that serves files works — no build step needed.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="page-section is-compact">
            <h2>Honest limitations</h2>
            <div className="page-prose is-sm">
              <p>
                Password-protected Framer pages can&apos;t be converted — the tool reads public URLs
                only. Framer&apos;s built-in form backend stays with Framer, so repoint forms to a
                service like Formspree or Tally after migrating. And in HTML mode, heavy runtime
                effects (custom cursors, WebGL) are trimmed for speed — the{" "}
                <Link href="/">Next.js export</Link> keeps them if you need exact behavior.
              </p>
            </div>
          </section>

          <section className="page-section is-compact">
            <h2>Self-hosting FAQ</h2>
            <div className="page-faq">
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="page-cta">
            <h2>Start self-hosting in one minute</h2>
            <div className="page-cta-form">
              <UrlFunnelForm cta="Convert my Framer site →" />
            </div>
          </section>
        </div>
      </main>

      {guideJsonLd().map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(obj) }} />
      ))}
    </>
  );
}
