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
  // A real, hand-picked cover wins; the "/opengraph-image" placeholder some
  // posts store is self-referential — fall back to the site-wide OG image
  // instead. There is deliberately NO per-post opengraph-image.tsx file
  // (removed): Next.js's file-convention resolver for a dynamic-segment +
  // route-group nested image route hits a native libvips crash on this
  // stack ("colourspace: parameter space not set") independent of the
  // route's own content — confirmed on the unmodified original file too —
  // and, worse, Next always prefers that colocated file's URL over whatever
  // this function returns, so setting a working URL here had no effect
  // while the file existed. Without the file, this explicit fallback is
  // what actually gets used.
  const hasCustomCover = p.coverImage && !p.coverImage.includes("/opengraph-image");
  const image = hasCustomCover ? (p.coverImage as string) : `${SITE.url}/opengraph-image`;
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
      images: [{ url: image }],
    },
    twitter: { card: "summary_large_image", title: p.title, description, images: [image] },
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
  const lede = p.excerpt || autoExcerpt(p.content);

  const meta = [
    { label: "Published", value: fmtDate(published) },
    { label: "Read time", value: `${readingTime(p.content)} min` },
    { label: "Written by", value: p.authorName || DEFAULT_AUTHOR },
  ];

  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <p className="page-breadcrumb">
                <Link href="/blog">Blog</Link>
              </p>
              <h1 className="page-title">{p.title}</h1>
            </div>
          </div>
          {lede && (
            <div className="page-head-row">
              <p className="page-intro is-wide">{lede}</p>
            </div>
          )}
        </div>
      </section>

      {/* Case-study style: a stacked meta row with a single link on the right,
          then the hero image below — no boxed frame, no color accent, just
          clean black-on-white spacing. */}
      <article className="page-body is-article">
        <div className="page-meta-row">
          {meta.map((m) => (
            <div key={m.label} className="page-meta-item">
              <span className="page-meta-label">{m.label}</span>
              <span className="page-meta-value">{m.value}</span>
            </div>
          ))}
          <Link href="/blog" className="page-backlink">
            All posts ↗
          </Link>
        </div>

        {/* On-page hero uses the generative cover — designed, distinct, and
            not redundant with the H1 above. A genuinely hand-picked coverImage
            (an uploaded photo/screenshot) still wins; the auto-generated OG
            title-card (…/opengraph-image) does not, since it just repeats the
            title. The OG card is still used for social-share meta above. */}
        {p.coverImage && !p.coverImage.includes("/opengraph-image") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.coverImage}
            alt={p.title}
            className="page-hero-img"
            style={{ aspectRatio: "1200 / 630" }}
          />
        ) : (
          <PostCover seed={p.slug} className="page-post-hero" />
        )}

        <div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />

        {p.tags.length > 0 && (
          <div className="page-tags has-rule">
            {p.tags.map((t) => (
              <span key={t} className="page-tag">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Soft CTA — every post links to a money page */}
        <div className="page-banner">
          <div className="page-banner-text">
            <h2>Convert your Framer site next</h2>
            <p>Free, takes about a minute, and you can preview the result before deploying.</p>
          </div>
          <Link href="/" className="page-btn is-sm">
            Convert free →
          </Link>
        </div>

        {nextPost && (
          <Link href={`/blog/${nextPost.slug}`} className="page-next">
            <PostCover seed={nextPost.slug} className="page-next-media" />
            <div className="page-next-body">
              <span className="page-post-kicker">Up next</span>
              <span className="page-next-title">{nextPost.title}</span>
            </div>
            <span className="page-next-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        )}

        <div className="page-backlink-row">
          <Link href="/blog" className="page-backlink">
            Back to blog ↗
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
    </main>
  );
}
