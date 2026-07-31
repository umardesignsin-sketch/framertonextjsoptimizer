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
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <h1 className="page-title">Blog</h1>
            </div>
          </div>
          <div className="page-head-row">
            <p className="page-intro is-wide">
              Guides and updates on converting{" "}
              <a href="https://www.framer.com" target="_blank" rel="noopener noreferrer">
                Framer
              </a>{" "}
              sites to fast <Link href="/">HTML</Link> and{" "}
              <a href="https://nextjs.org/docs/app" target="_blank" rel="noopener noreferrer">
                Next.js
              </a>{" "}
              — performance, SEO, and deployment.
            </p>
          </div>
        </div>
      </section>

      <div className="page-body is-compact">
        {posts.length === 0 ? (
          <p className="page-empty">No posts yet — check back soon.</p>
        ) : (
          <>
            {/* Featured post — the latest, big and unmissable */}
            <Link href={`/blog/${featured.slug}`} className="page-feature">
              <PostCover seed={featured.slug} className="page-feature-media" />
              <div className="page-feature-body">
                <span className="page-post-kicker">Latest</span>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt || autoExcerpt(featured.content, 40)}</p>
                <div className="page-post-meta">
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
              <div className="page-cards is-3">
                {rest.map((p) => {
                  const published = p.publishedAt || p.createdAt;
                  return (
                    <Link key={p.id} href={`/blog/${p.slug}`} className="page-post">
                      <PostCover seed={p.slug} className="page-post-media" />
                      <div className="page-post-body">
                        <span className="page-post-kicker">
                          <time dateTime={published.toISOString()}>{fmtDate(published)}</time>
                          {" · "}
                          {readingTime(p.content)} min
                        </span>
                        <h2>{p.title}</h2>
                        <p>{p.excerpt || autoExcerpt(p.content, 24)}</p>
                        <span className="page-tile-more">Read more →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="page-backlink-row">
          <Link href="/" className="page-backlink">
            Back to home ↗
          </Link>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(blogJsonLd(posts)) }} />
    </main>
  );
}
