// The APP's own SEO/AEO data: site identity, JSON-LD structured data, and the
// FAQ used both as visible content and as FAQPage schema (single source of
// truth). Distinct from lib/seo.ts, which optimizes CONVERTED sites.

export const SITE = {
  name: "Framer → Next.js Optimizer",
  shortName: "Framer to Next.js",
  url: "https://framertonextjs.com",
  tagline: "Convert Framer sites to optimized Next.js",
  description:
    "Convert any published Framer site into a fast, deployable Next.js project or optimized static bundle. Strips Framer's runtime, self-hosts images as WebP, inlines fonts, and runs an SEO pass for top Lighthouse scores — plus a visual editor to change text, links, and images and publish live.",
} as const;

/** Keywords worth ranking for (also a useful signal for answer engines). */
export const KEYWORDS = [
  "Framer to Next.js",
  "convert Framer to Next.js",
  "Framer to Next.js converter",
  "export Framer site",
  "Framer Next.js export",
  "optimize Framer site",
  "Framer Lighthouse score",
  "Framer SEO",
  "static site from Framer",
  "Framer to React",
  "deploy Framer to Vercel",
  "deploy Framer to Netlify",
];

/** Q&A pairs — rendered as a visible FAQ and as FAQPage JSON-LD. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "What does the Framer → Next.js Optimizer do?",
    a: "It takes a published Framer URL and returns a production-ready site: it captures the server-rendered HTML, removes Framer's heavy JavaScript runtime, self-hosts and re-encodes images to WebP, inlines fonts, and runs an SEO pass. You get either an optimized static bundle (Hybrid) or a real Next.js App Router project (Pure Next.js) that you can deploy anywhere.",
  },
  {
    q: "How do I convert a Framer site to Next.js?",
    a: "Paste your published Framer URL (for example https://your-site.framer.website) into the converter and click Convert. The tool crawls every page, optimizes it, and gives you a downloadable project plus a one-click deploy to Netlify or Vercel. No code is required to start.",
  },
  {
    q: "Will converting my Framer site improve SEO and Lighthouse scores?",
    a: "Yes. Removing the client-side runtime, self-hosting WebP images, and inlining fonts typically pushes SEO, Best Practices, and Accessibility to 95–100 and Performance to 90–100 on desktop. Mobile scores are usually 75–95 because Lighthouse throttles mobile CPU 4×, so compare mobile-to-mobile.",
  },
  {
    q: "Does the conversion keep my animations and interactivity?",
    a: "It depends on the mode. Pure Next.js keeps Framer's runtime intact, so every animation and interaction renders exactly like the original. Hybrid strips the runtime for maximum speed and re-creates appear and scroll animations with a tiny CSS + IntersectionObserver layer.",
  },
  {
    q: "What is the difference between Hybrid and Pure Next.js output?",
    a: "Hybrid is the fastest, most optimized static bundle — it removes the Framer runtime and rebuilds animations in lightweight CSS. Pure Next.js is a real, deployable Next.js App Router project with one statically-prerendered route per page that renders identically to the source. Choose Hybrid for top Lighthouse scores, Pure Next.js for real code and exact fidelity.",
  },
  {
    q: "Can I deploy the converted site to Vercel or Netlify?",
    a: "Yes. Both output types deploy to Netlify or Vercel with no build step using your own access token, and the converter can push it live for you. You can also download the project as a .zip and deploy it however you like.",
  },
  {
    q: "Can I edit the converted site after converting?",
    a: "Yes. A built-in visual editor lets you edit text, change links, and swap images across Desktop, Tablet, and Phone breakpoints, then publish the changes straight to your live site — without touching Framer or the code.",
  },
  {
    q: "Does it work with multi-page Framer sites?",
    a: "Yes. The converter discovers and converts every page of a published Framer site, including nested routes like /work/project, and preserves the original URL structure.",
  },
  {
    q: "Is it free and do I need to know how to code?",
    a: "You can convert and preview for free, and no coding is required — paste a URL and get an optimized site. Deploying live uses your own free Netlify or Vercel account.",
  },
];

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;
const APP_ID = `${SITE.url}/#app`;

/** Sitewide JSON-LD graph: Organization + WebSite + SoftwareApplication. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        logo: { "@type": "ImageObject", url: `${SITE.url}/icon.svg` },
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        publisher: { "@id": ORG_ID },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": APP_ID,
        name: SITE.name,
        url: SITE.url,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: SITE.description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Convert Framer sites to Next.js",
          "Optimized static bundle export",
          "WebP image optimization and self-hosting",
          "Font inlining and SEO pass",
          "One-click deploy to Netlify and Vercel",
          "Visual editor for text, links, and images",
          "Multi-page and responsive breakpoint support",
        ],
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

/** FAQPage JSON-LD built from the FAQ array above. */
export function faqJsonLd() {
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

/** Serialize a JSON-LD object for safe embedding in a <script> tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
