import type { Metadata } from "next";
import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { listPublishedPosts, autoExcerpt, readingTime, blogJsonLd, DEFAULT_AUTHOR } from "@/lib/blog";
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
    <div className="min-h-screen w-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5 text-[13px]">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[13px] font-bold text-background">F</span>
            <span className="font-semibold">Framer → Next.js Optimizer</span>
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Converter</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Blog</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Guides and updates on converting{" "}
          <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Framer</a>{" "}
          sites to{" "}
          <a href="https://nextjs.org/docs/app" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Next.js</a>{" "}
          — performance, SEO, deployment, and shipping fast. Try it on the{" "}
          <Link href="/" className="text-foreground underline underline-offset-2">Hybrid converter</Link> or the{" "}
          <Link href="/nextjs" className="text-foreground underline underline-offset-2">Pure Next.js export</Link>.
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 rounded-xl border border-border bg-muted/30 px-5 py-10 text-center text-[14px] text-muted-foreground">
            No posts yet — check back soon.
          </p>
        ) : (
          <ul className="mt-10 space-y-8">
            {posts.map((p) => {
              const published = p.publishedAt || p.createdAt;
              return (
                <li key={p.id} className="border-b border-border pb-8 last:border-0">
                  <Link href={`/blog/${p.slug}`} className="group block">
                    <h2 className="text-xl font-semibold tracking-tight group-hover:underline">{p.title}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
                      <span>{p.authorName || DEFAULT_AUTHOR}</span>
                      <span>·</span>
                      <time dateTime={published.toISOString()}>{fmtDate(published)}</time>
                      <span>·</span>
                      <span>{readingTime(p.content)} min read</span>
                    </div>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                      {p.excerpt || autoExcerpt(p.content)}
                    </p>
                    <span className="mt-2 inline-block text-[13px] font-medium text-foreground">Read more →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(blogJsonLd(posts)) }} />
    </div>
  );
}
