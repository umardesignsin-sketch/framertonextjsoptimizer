import { notFound } from "next/navigation";
import { getPostById } from "@/lib/blog";
import { dbConfigured } from "@/lib/db";
import { PostEditor } from "./PostEditor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center text-sm text-muted-foreground">
        Set <code>DATABASE_URL</code> to use the blog.
      </div>
    );
  }
  const { id } = await params;
  const p = await getPostById(id);
  if (!p) notFound();

  return (
    <PostEditor
      post={{
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt ?? "",
        content: p.content,
        coverImage: p.coverImage ?? "",
        tags: p.tags,
        authorName: p.authorName ?? "",
        status: p.status,
      }}
    />
  );
}
