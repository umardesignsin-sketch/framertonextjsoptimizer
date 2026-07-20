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
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Free Web Tools</h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Small, free utilities for shipping a site — no signup required.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-xl border border-border p-5 transition-colors hover:border-foreground"
          >
            <h2 className="text-[15px] font-semibold">{tool.title}</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{tool.description}</p>
            <span className="mt-3 inline-block text-[13px] font-medium text-foreground">Open →</span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-[13px] text-muted-foreground">
        Converting a Framer site? Start with the{" "}
        <Link href="/" className="text-foreground underline underline-offset-2">Hybrid converter</Link>{" "}
        or{" "}
        <Link href="/nextjs" className="text-foreground underline underline-offset-2">Pure Next.js export</Link>.
      </p>
    </main>
  );
}
