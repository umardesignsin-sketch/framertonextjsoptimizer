import { listAllPosts } from "@/lib/blog";
import { dbConfigured } from "@/lib/db";
import { BlogManager } from "./BlogManager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminBlogPage() {
  if (!dbConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center text-sm text-muted-foreground">
        Set <code>DATABASE_URL</code> to use the blog.
      </div>
    );
  }
  const posts = await listAllPosts();
  const rows = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    updatedAt: p.updatedAt.toISOString(),
  }));
  return <BlogManager initial={rows} />;
}
