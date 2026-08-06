import Link from "next/link";

export const metadata = {
  title: { absolute: "Free Web Tools — Meta Tags Checker, Robots.txt Generator" },
  description:
    "Small, free tools for shipping a site: check meta tags and social previews, generate a robots.txt, and more.",
  alternates: { canonical: "/tools" },
  openGraph: {
    type: "website",
    url: "/tools",
    title: "Free Web Tools — Meta Tags Checker, Robots.txt Generator",
    description:
      "Small, free tools for shipping a site: check meta tags and social previews, generate a robots.txt, and more.",
  },
};

const TOOLS = [
  {
    href: "/tools/meta-tags-checker",
    title: "Meta Tags & Social Preview Checker",
    description:
      "Paste a URL to see its title, description, Open Graph, and Twitter Card tags, plus a preview of how it looks when shared.",
  },
  {
    href: "/tools/robots-txt-generator",
    title: "Robots.txt Generator",
    description:
      "Allow or block specific crawlers, disallow paths, and add a sitemap URL — copy or download the file.",
  },
];

export default function ToolsPage() {
  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <h1 className="page-title">Free Web Tools</h1>
            </div>
          </div>
          <div className="page-head-row">
            <p className="page-intro is-wide">
              Small, free utilities for shipping a site — no signup required.
            </p>
          </div>
        </div>
      </section>

      <div className="page-body is-narrow is-compact">
        <div className="page-cards">
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="page-tile">
              <h2>{tool.title}</h2>
              <p>{tool.description}</p>
              <span className="page-tile-more">Open →</span>
            </Link>
          ))}
        </div>

        <p className="page-note">
          Converting a Framer site? Start with the{" "}
          <Link href="/" className="page-link">
            Hybrid converter
          </Link>{" "}
          or the{" "}
          <Link href="/" className="page-link">
            Pure Next.js export
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
