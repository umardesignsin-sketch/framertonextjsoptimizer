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

      <article className="mx-auto max-w-3xl px-5 py-12">
        <nav className="text-[12.5px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link> ·{" "}
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
        </nav>

        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{p.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          <span>{p.authorName || DEFAULT_AUTHOR}</span>
          <span>·</span>
          <time dateTime={published.toISOString()}>{fmtDate(published)}</time>
          <span>·</span>
          <span>{readingTime(p.content)} min read</span>
        </div>

        {p.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverImage} alt={p.title} className="mt-6 w-full rounded-xl border border-border object-cover" />
        )}

        <div className="blog-content mt-8" dangerouslySetInnerHTML={{ __html: html }} />

        {p.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {p.tags.map((t) => (
              <span key={t} className="rounded-full border border-border px-2.5 py-1 text-[12px] text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-xl border border-border bg-muted/40 p-5">
          <p className="text-[15px] font-medium">Convert your Framer site next</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Turn any published Framer site into a fast, deployable site with the{" "}
            <Link href="/" className="underline">Hybrid converter</Link> or the{" "}
            <Link href="/nextjs" className="underline">Pure Next.js export</Link>, then{" "}
            <Link href="/speed" className="underline">compare the scores</Link>.
          </p>
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
