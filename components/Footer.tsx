import Link from "next/link";
import { FinalCta } from "@/components/FinalCta";

// Figma: Homepage → "Final cta+Footer" → "FOOTER" (node 5:564). 1360px frame,
// 80px side gutters — the same rhythm the benefits / how-it-works / FAQ
// sections use, so the brand column lines up with their headings.
const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Framer to Next.js", href: "/nextjs" },
      { label: "Framer to HTML", href: "/framer-to-html" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Blog", href: "/blog" },
      { label: "Free Framer Templates", href: "/templates" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    heading: "Tools",
    links: [
      // The Lighthouse/PageSpeed checker lives at /speed, not under /tools.
      { label: "Lighthouse Checker", href: "/speed" },
      { label: "Meta Tags Checker", href: "/tools/meta-tags-checker" },
      { label: "Robots.txt Generator", href: "/tools/robots-txt-generator" },
    ],
  },
];

export function Footer() {
  return (
    <>
      <FinalCta />

      <footer className="mktg-footer">
        <div className="mktg-footer-grid">
          <div className="mktg-footer-brand">
            <Link href="/" className="mktg-footer-logo" aria-label="FNJ home">
              <span className="mktg-footer-mark">
                {/* Exported brand mark — the glyph is inset inside its 48px box. */}
                <span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/fnj-mark.svg" alt="" />
                </span>
              </span>
              <span className="mktg-footer-wordmark">FNJ</span>
            </Link>
            <p className="mktg-footer-tagline">
              Convert your published Framer sites into fast HTML or a real Next.js project.
            </p>
          </div>

          <div className="mktg-footer-links">
            {COLUMNS.map((col) => (
              <div key={col.heading} className="mktg-footer-col">
                <p className="mktg-footer-col-heading">{col.heading}</p>
                <ul className="mktg-footer-col-list">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mktg-footer-legal">
          © {new Date().getFullYear()} Framertonextjs. Not affiliated with Framer.
        </p>
      </footer>
    </>
  );
}
