import type { Metadata } from "next";
import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { listPublishedPosts, autoExcerpt, readingTime, blogJsonLd, DEFAULT_AUTHOR } from "@/lib/blog";
import { jsonLdScript } from "@/lib/site-meta";
import { PostCover } from "@/components/PostCover";

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
  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen w-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 text-[13px]">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[13px] font-bold text-background">F</span>
            <span className="font-semibold">Framer → Next.js Optimizer</span>
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Converter ↗</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="pt-14 pb-6">
          <h1 className="text-[42px] font-semibold leading-[1.05] tracking-tight sm:text-[56px]">Blog</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
            Guides and updates on converting{" "}
            <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-blue-600 underline-offset-2">Framer</a>{" "}
            sites to fast{" "}
            <Link href="/framer-to-html" className="text-foreground underline decoration-blue-600 underline-offset-2">HTML</Link>{" "}
            and{" "}
            <a href="https://nextjs.org/docs/app" target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-blue-600 underline-offset-2">Next.js</a>{" "}
            — performance, SEO, and deployment.
          </p>
        </section>

        {posts.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-border bg-muted/30 px-5 py-16 text-center text-[14px] text-muted-foreground">
            No posts yet — check back soon.
          </p>
        ) : (
          <>
            {/* Featured post — the latest, big and unmissable */}
            <Link
              href={`/blog/${featured.slug}`}
              className="group mt-8 grid gap-0 overflow-hidden rounded-2xl border border-border sm:grid-cols-2"
            >
              <PostCover seed={featured.slug} className="h-56 sm:h-full" />
              <div className="flex flex-col justify-center p-7 sm:p-9">
                <span className="inline-flex w-fit items-center rounded-full bg-blue-600/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Latest
                </span>
                <h2 className="mt-4 text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px] group-hover:underline decoration-blue-600">
                  {featured.title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {featured.excerpt || autoExcerpt(featured.content, 40)}
                </p>
                <div className="mt-5 flex items-center gap-3 text-[12.5px] text-muted-foreground">
                  <span>{featured.authorName || DEFAULT_AUTHOR}</span>
                  <span>·</span>
                  <time dateTime={(featured.publishedAt || featured.createdAt).toISOString()}>
                    {fmtDate(featured.publishedAt || featured.createdAt)}
                  </time>
                  <span>·</span>
                  <span>{readingTime(featured.content)} min read</span>
                </div>
              </div>
            </Link>

            {/* Grid of the rest */}
            {rest.length > 0 && (
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => {
                  const published = p.publishedAt || p.createdAt;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/blog/${p.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border transition-shadow hover:shadow-lg hover:shadow-black/5"
                      >
                        <PostCover seed={p.slug} className="h-36" />
                        <div className="flex flex-1 flex-col p-5">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            <time dateTime={published.toISOString()}>{fmtDate(published)}</time>
                            <span className="mx-1.5">·</span>
                            {readingTime(p.content)} min
                          </div>
                          <h2 className="mt-2 text-[16.5px] font-semibold leading-snug tracking-tight group-hover:underline decoration-blue-600">
                            {p.title}
                          </h2>
                          <p className="mt-2 line-clamp-3 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
                            {p.excerpt || autoExcerpt(p.content, 24)}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground">
                            Read more
                            <span className="transition-transform group-hover:translate-x-0.5">→</span>
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        <div className="mt-16 flex justify-center border-t border-border pt-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
          >
            Back to home
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
          </Link>
        </div>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(blogJsonLd(posts)) }} />
    </div>
  );
}
