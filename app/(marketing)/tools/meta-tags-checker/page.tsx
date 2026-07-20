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
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        <Link href="/tools" className="hover:text-foreground">Tools</Link> / Meta Tags Checker
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Meta Tags &amp; Social Preview Checker
      </h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Paste any published URL to see exactly what search engines and social
        platforms read from it — title, description, canonical, Open Graph,
        and Twitter Card tags — plus a preview of how the link renders when
        shared on Slack, iMessage, or LinkedIn.
      </p>
      <div className="mt-6">
        <MetaTagsChecker />
      </div>
      <p className="mt-6 text-[13px] text-muted-foreground">
        Converting a Framer site? Every conversion through the{" "}
        <Link href="/" className="text-foreground underline underline-offset-2">Hybrid converter</Link>{" "}
        or{" "}
        <Link href="/nextjs" className="text-foreground underline underline-offset-2">Pure Next.js export</Link>{" "}
        already runs a full SEO pass automatically — this tool is for checking any site, including ones already live.
      </p>
    </main>
  );
}
