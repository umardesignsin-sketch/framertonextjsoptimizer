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

  const meta = [
    { label: "Published", value: fmtDate(published) },
    { label: "Read time", value: `${readingTime(p.content)} min` },
    { label: "Written by", value: p.authorName || DEFAULT_AUTHOR },
  ];

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

      {/* Case-study style: title + subtitle, a stacked meta list on the left
          with a single link on the right, then the hero image below — no
          boxed frame, no color accent, just clean black-on-white spacing. */}
      <article className="mx-auto max-w-3xl px-5 pb-24 pt-14 sm:pt-16">
        <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
          {p.title}
        </h1>
        {(p.excerpt || autoExcerpt(p.content)) && (
          <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
            {p.excerpt || autoExcerpt(p.content)}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-start justify-between gap-y-8 sm:items-center">
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-14">
            {meta.map((m) => (
              <div key={m.label}>
                <div className="text-[12px] text-muted-foreground">{m.label}</div>
                <div className="mt-1 text-[14.5px] font-medium">{m.value}</div>
              </div>
            ))}
          </div>
          <Link
            href="/blog"
            className="group inline-flex shrink-0 items-center gap-1.5 border-b border-foreground pb-0.5 text-[13.5px] font-medium"
          >
            All posts
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
          </Link>
        </div>

        {p.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.coverImage}
            alt={p.title}
            // Cover images are 1200x630 (the OG-image standard ratio,
            // ~1.91:1) — a 16:10 box with object-cover was cropping both
            // edges and clipping the title text baked into the image.
            className="mt-10 aspect-[1200/630] w-full rounded-lg object-cover"
          />
        ) : (
          <PostCover seed={p.slug} className="mt-10 aspect-[16/10] w-full rounded-lg" />
        )}

        <div className="blog-content mt-12" dangerouslySetInnerHTML={{ __html: html }} />

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
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-lg border border-border p-6 sm:flex-row sm:items-center">
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
            className="group mt-6 flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:border-foreground"
          >
            <PostCover seed={nextPost.slug} className="h-16 w-24 shrink-0 rounded-md" />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Up next</div>
              <div className="mt-0.5 truncate text-[15px] font-semibold group-hover:underline">
                {nextPost.title}
              </div>
            </div>
            <span className="ml-auto shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        )}

        <div className="mt-14 flex justify-center">
          <Link
            href="/blog"
            className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
          >
            Back to blog
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
          </Link>
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
