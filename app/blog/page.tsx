import type { Metadata } from "next";
import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { listPublishedPosts, autoExcerpt, readingTime, blogJsonLd } from "@/lib/blog";
import { jsonLdScript } from "@/lib/site-meta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Blog — Framer to Next.js guides & updates",
  description:
    "Guides and updates on converting Framer sites to Next.js — performance, SEO, deployment, and shipping fast.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Blog — Framer to Next.js guides & updates",
    description:
      "Guides and updates on converting Framer sites to Next.js — performance, SEO, deployment, and shipping fast.",
  },
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function BlogIndexPage() {
  const posts = dbConfigured() ? await listPublishedPosts() : [];

  return (
    <div className="min-h-screen w-full bg-background px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl rounded-[20px] border border-border px-5 py-12 sm:px-12 sm:py-16">
        <nav className="flex items-center justify-between text-[12.5px]">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[13px] font-bold text-background">F</span>
            <span className="font-semibold">Framer → Next.js Optimizer</span>
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Converter ↗</Link>
        </nav>

        <header className="mt-12">
          <h1 className="text-[38px] font-semibold leading-[1.05] tracking-tight sm:text-[52px]">Blog</h1>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            Guides and updates on converting{" "}
            <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Framer</a>{" "}
            sites to fast{" "}
            <Link href="/framer-to-html" className="text-foreground underline underline-offset-2">HTML</Link>{" "}
            and{" "}
            <a href="https://nextjs.org/docs/app" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Next.js</a>{" "}
            — performance, SEO, and deployment.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-14 border-t border-border pt-14 text-center text-[14px] text-muted-foreground">
            No posts yet — check back soon.
          </p>
        ) : (
          <ul className="mt-12 border-t border-border">
            {posts.map((p) => {
              const published = p.publishedAt || p.createdAt;
              return (
                <li key={p.id} className="border-b border-border">
                  <Link href={`/blog/${p.slug}`} className="group block py-8">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      <time dateTime={published.toISOString()}>{fmtDate(published)}</time>
                      <span className="mx-2">·</span>
                      {readingTime(p.content)} min read
                    </div>
                    <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px] group-hover:underline">
                      {p.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                      {p.excerpt || autoExcerpt(p.content)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-foreground">
                      Read more
                      <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-14 flex justify-center border-t border-border pt-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
          >
            Back to home
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
          </Link>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(blogJsonLd(posts)) }} />
    </div>
  );
}
