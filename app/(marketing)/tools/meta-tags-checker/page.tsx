import Link from "next/link";
import { MetaTagsChecker } from "@/components/MetaTagsChecker";

export const metadata = {
  title: { absolute: "Meta Tags & Social Preview Checker — Free Tool" },
  description:
    "Paste any URL and see its title, description, Open Graph, and Twitter Card tags — plus a preview of how the link looks when shared on Slack, iMessage, or LinkedIn.",
  alternates: { canonical: "/tools/meta-tags-checker" },
  openGraph: {
    type: "website",
    url: "/tools/meta-tags-checker",
    title: "Meta Tags & Social Preview Checker — Free Tool",
    description:
      "Paste any URL and see its title, description, Open Graph, and Twitter Card tags — plus a preview of how the link looks when shared.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meta Tags & Social Preview Checker — Free Tool",
    description:
      "Paste any URL and see its title, description, Open Graph, and Twitter Card tags — plus a preview of how the link looks when shared.",
  },
};

export default function MetaTagsCheckerPage() {
  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <p className="page-breadcrumb">
                <Link href="/tools">Tools</Link> / Meta Tags Checker
              </p>
              <h1 className="page-title">Meta Tags &amp; Social Preview Checker</h1>
            </div>
          </div>
          <div className="page-head-row">
            <p className="page-intro is-wide">
              Paste any published URL to see exactly what search engines and social
              platforms read from it — title, description, canonical, Open Graph,
              and Twitter Card tags — plus a preview of how the link renders when
              shared on Slack, iMessage, or LinkedIn.
            </p>
          </div>
        </div>
      </section>

      <div className="page-body is-narrow is-compact">
        <div className="page-widget">
          <MetaTagsChecker />
        </div>

        <p className="page-note">
          Converting a Framer site? Every conversion through the{" "}
          <Link href="/" className="page-link">
            Hybrid converter
          </Link>{" "}
          or{" "}
          <Link href="/" className="page-link">
            Pure Next.js export
          </Link>{" "}
          already runs a full SEO pass automatically — this tool is for checking
          any site, including ones already live.
        </p>
      </div>
    </main>
  );
}
