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
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        <Link href="/tools" className="hover:text-foreground">Tools</Link> / Robots.txt Generator
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Robots.txt Generator
      </h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Build a valid <code className="rounded bg-muted px-1 py-0.5 text-[13px]">robots.txt</code> in
        seconds — allow everything, block everything, or set per-crawler rules
        for Googlebot, Bingbot, GPTBot, and others. Copy it or download the
        file and drop it in your site&apos;s <code className="rounded bg-muted px-1 py-0.5 text-[13px]">public/</code> folder.
      </p>
      <div className="mt-6">
        <RobotsTxtGenerator />
      </div>
      <p className="mt-6 text-[13px] text-muted-foreground">
        Deploying a converted Next.js project? Add the generated file as{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[12.5px]">public/robots.txt</code>{" "}
        — Next.js serves it automatically at the root.
      </p>
    </main>
  );
}
