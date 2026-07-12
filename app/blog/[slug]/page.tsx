import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import {
  getPublishedPost,
  renderMarkdown,
  readingTime,
  autoExcerpt,
  postJsonLd,
  postUrl,
  DEFAULT_AUTHOR,
} from "@/lib/blog";
import { jsonLdScript, SITE } from "@/lib/site-meta";

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
  const p = await getPublishedPost(slug);
  if (!p) notFound();

  const published = p.publishedAt || p.createdAt;
  const html = renderMarkdown(p.content);

  const meta = [
    { label: "Published", value: fmtDate(published) },
    { label: "Read time", value: `${readingTime(p.content)} min` },
    { label: "Written by", value: p.authorName || DEFAULT_AUTHOR },
  ];

  return (
    <div className="min-h-screen w-full bg-background px-4 py-4 sm:px-6 sm:py-6">
      {/* Thin framed editorial canvas */}
      <div className="mx-auto max-w-3xl rounded-[20px] border border-border px-5 py-12 sm:px-12 sm:py-16">
        <nav className="text-[12.5px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
        </nav>

        <article>
          <h1 className="mt-6 text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
            {p.title}
          </h1>
          {(p.excerpt || autoExcerpt(p.content)) && (
            <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
              {p.excerpt || autoExcerpt(p.content)}
            </p>
          )}

          {/* Case-study-style metadata row */}
          <div className="mt-10 flex flex-wrap items-end justify-between gap-y-6 border-t border-border pt-6">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 sm:flex sm:gap-x-14">
              {meta.map((m) => (
                <div key={m.label}>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
                  <div className="mt-1 text-[14px] font-medium">{m.value}</div>
                </div>
              ))}
            </div>
            <Link
              href="/framer-to-html"
              className="group inline-flex items-center gap-1.5 border-b border-foreground pb-0.5 text-[14px] font-medium"
            >
              Try the converter
              <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
            </Link>
          </div>

          {p.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.coverImage}
              alt={p.title}
              className="mt-10 aspect-[16/9] w-full rounded-2xl border border-border object-cover"
            />
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

          <div className="mt-14 flex justify-center border-t border-border pt-10">
            <Link
              href="/blog"
              className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
            >
              Back to blog
              <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
            </Link>
          </div>
        </article>
      </div>

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
