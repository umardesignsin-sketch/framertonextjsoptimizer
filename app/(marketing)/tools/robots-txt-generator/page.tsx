import Link from "next/link";
import { RobotsTxtGenerator } from "@/components/RobotsTxtGenerator";

export const metadata = {
  title: { absolute: "Robots.txt Generator — Free Tool" },
  description:
    "Generate a robots.txt file for your site in seconds. Allow or block specific crawlers (Googlebot, Bingbot, GPTBot, ClaudeBot), disallow paths, and add your sitemap URL.",
  alternates: { canonical: "/tools/robots-txt-generator" },
  openGraph: {
    type: "website",
    url: "/tools/robots-txt-generator",
    title: "Robots.txt Generator — Free Tool",
    description:
      "Generate a robots.txt file for your site in seconds. Allow or block specific crawlers, disallow paths, and add your sitemap URL.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Robots.txt Generator — Free Tool",
    description:
      "Generate a robots.txt file for your site in seconds. Allow or block specific crawlers, disallow paths, and add your sitemap URL.",
  },
};

export default function RobotsTxtGeneratorPage() {
  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <p className="page-breadcrumb">
                <Link href="/tools">Tools</Link> / Robots.txt Generator
              </p>
              <h1 className="page-title">Robots.txt Generator</h1>
            </div>
          </div>
          <div className="page-head-row">
            <p className="page-intro is-wide">
              Build a valid <code className="page-code">robots.txt</code> in seconds —
              allow everything, block everything, or set per-crawler rules for
              Googlebot, Bingbot, GPTBot, and others. Copy it or download the file
              and drop it in your site&apos;s <code className="page-code">public/</code>{" "}
              folder.
            </p>
          </div>
        </div>
      </section>

      <div className="page-body is-narrow is-compact">
        <div className="page-widget">
          <RobotsTxtGenerator />
        </div>

        <p className="page-note">
          Deploying a converted Next.js project? Add the generated file as{" "}
          <code className="page-code">public/robots.txt</code> — Next.js serves it
          automatically at the root.
        </p>
      </div>
    </main>
  );
}
