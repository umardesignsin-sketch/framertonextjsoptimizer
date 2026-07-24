// Blog data + rendering helpers (server-only: uses Prisma + marked). Posts are
// authored in the founders panel as Markdown and rendered at request time.
import { marked } from "marked";
import { db } from "./db";
import { SITE } from "./site-meta";

marked.setOptions({ gfm: true, breaks: false });

export interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  tags: string[];
  status: string;
  authorName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_AUTHOR = "The Framer → Next.js team";

/** URL-safe slug from a title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Render Markdown to HTML. Author is the trusted founder, so raw HTML passes. */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

/** Rough reading time in minutes (~200 wpm). */
export function readingTime(md: string): number {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Plain-text excerpt fallback from Markdown (first ~30 words). */
export function autoExcerpt(md: string, words = 34): string {
  const text = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const parts = text.split(" ");
  return parts.length <= words ? text : parts.slice(0, words).join(" ") + "…";
}

export async function listPublishedPosts(): Promise<PostRow[]> {
  return db.post.findMany({
    where: { status: "published" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  }) as unknown as Promise<PostRow[]>;
}

export async function getPublishedPost(slug: string): Promise<PostRow | null> {
  return db.post.findFirst({
    where: { slug, status: "published" },
  }) as unknown as Promise<PostRow | null>;
}

export async function listAllPosts(): Promise<PostRow[]> {
  return db.post.findMany({ orderBy: { updatedAt: "desc" } }) as unknown as Promise<PostRow[]>;
}

export async function getPostById(id: string): Promise<PostRow | null> {
  return db.post.findUnique({ where: { id } }) as unknown as Promise<PostRow | null>;
}

export function postUrl(slug: string): string {
  return `${SITE.url}/blog/${slug}`;
}

/** BlogPosting JSON-LD for a single post. */
export function postJsonLd(p: PostRow) {
  const published = (p.publishedAt || p.createdAt).toISOString();
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.excerpt || autoExcerpt(p.content),
    image:
      p.coverImage && !p.coverImage.includes("/opengraph-image")
        ? [p.coverImage]
        : [`${SITE.url}/opengraph-image`],
    datePublished: published,
    dateModified: p.updatedAt.toISOString(),
    author: { "@type": "Organization", name: p.authorName || DEFAULT_AUTHOR, url: SITE.url },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${SITE.url}/icon.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl(p.slug) },
    keywords: p.tags.join(", "),
    inLanguage: "en",
  };
}

/** Blog index JSON-LD (Blog + ItemList of posts). */
export function blogJsonLd(posts: PostRow[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE.url}/blog#blog`,
    name: `${SITE.name} Blog`,
    url: `${SITE.url}/blog`,
    description: "Guides and updates on converting Framer sites to Next.js, performance, SEO, and shipping fast.",
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: postUrl(p.slug),
      datePublished: (p.publishedAt || p.createdAt).toISOString(),
      author: { "@type": "Organization", name: p.authorName || DEFAULT_AUTHOR },
    })),
  };
}
