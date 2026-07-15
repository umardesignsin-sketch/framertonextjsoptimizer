import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import {
  getPublishedPost,
  listPublishedPosts,
  renderMarkdown,
  readingTime,
  autoExcerpt,
  postJsonLd,
  postUrl,
  DEFAULT_AUTHOR,
} from "@/lib/blog";
import { jsonLdScript, SITE } from "@/lib/site-meta";
import { PostCover } from "@/components/PostCover";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!dbConfigured()) return {};
  const { slug } = await params;
  const p = await getPublishedPost(slug);
  if (!p) return { title: "Post not found" };
  const description = p.excerpt || autoExcerpt(p.content);
  const url = `/blog/${p.slug}`;
  return {
    title: p.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: p.title,
      description,
      publishedTime: (p.publishedAt || p.createdAt).toISOString(),
      modifiedTime: p.updatedAt.toISOString(),
      authors: [p.authorName || DEFAULT_AUTHOR],
      tags: p.tags,
      images: p.coverImage ? [{ url: p.coverImage }] : undefined,
    },
    twitter: { card: "summary_large_image", title: p.title, description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) notFound();
  const { slug } = await params;
  const [p, allPosts] = await Promise.all([getPublishedPost(slug), listPublishedPosts()]);
  if (!p) notFound();

  const published = p.publishedAt || p.createdAt;
  const html = renderMarkdown(p.content);
  const nextPost = allPosts.find((x) => x.slug !== p.slug) || null;

  return (
    <div className="min-h-screen w-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5 text-[13px]">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[13px] font-bold text-background">F</span>
            <span className="font-semibold">Framer → Next.js Optimizer</span>
          </Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground">All posts</Link>
        </div>
      </header>

      <article>
        {/* Hero: real cover if set, otherwise a generated gradient — never a
            blank strip. Title sits below, magazine-style. */}
        {p.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverImage} alt={p.title} className="h-56 w-full object-cover sm:h-80" />
        ) : (
          <PostCover seed={p.slug} className="h-40 w-full sm:h-56" />
        )}

        <div className="mx-auto max-w-3xl px-5 pb-24 pt-10">
          <nav className="text-[12.5px] text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
          </nav>

          <h1 className="mt-5 text-[32px] font-semibold leading-[1.12] tracking-tight sm:text-[42px]">
            {p.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border pb-6 text-[13.5px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                {(p.authorName || DEFAULT_AUTHOR).trim().charAt(0)}
              </span>
              {p.authorName || DEFAULT_AUTHOR}
            </span>
            <span>·</span>
            <time dateTime={published.toISOString()}>{fmtDate(published)}</time>
            <span>·</span>
            <span>{readingTime(p.content)} min read</span>
          </div>

          <div className="blog-content mt-10" dangerouslySetInnerHTML={{ __html: html }} />

          {p.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-2 border-t border-border pt-8">
              {p.tags.map((t) => (
                <span key={t} className="rounded-full border border-border px-2.5 py-1 text-[12px] text-muted-foreground">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Soft CTA — every post links to a money page */}
          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-muted/30 p-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-[15px] font-semibold">Convert your Framer site next</p>
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                Free, takes about a minute, and you can preview the result before deploying.
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 rounded-lg bg-foreground px-5 py-2.5 text-[13.5px] font-medium text-background hover:opacity-90"
            >
              Convert free →
            </Link>
          </div>

          {nextPost && (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="group mt-6 flex items-center gap-4 rounded-2xl border border-border p-4 transition-shadow hover:shadow-lg hover:shadow-black/5"
            >
              <PostCover seed={nextPost.slug} className="h-16 w-24 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Up next</div>
                <div className="mt-0.5 truncate text-[15px] font-semibold group-hover:underline decoration-blue-600">
                  {nextPost.title}
                </div>
              </div>
              <span className="ml-auto shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          )}

          <div className="mt-10 flex justify-center">
            <Link
              href="/blog"
              className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
            >
              Back to blog
              <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
            </Link>
          </div>
        </div>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(postJsonLd(p)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE.url}/blog` },
              { "@type": "ListItem", position: 3, name: p.title, item: postUrl(p.slug) },
            ],
          }),
        }}
      />
    </div>
  );
}
