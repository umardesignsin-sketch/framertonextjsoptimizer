"use client";

import { useState } from "react";
import Link from "next/link";

interface PostData {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  tags: string[];
  authorName: string;
  status: string;
}

export function PostEditor({ post }: { post: PostData }) {
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [coverImage, setCoverImage] = useState(post.coverImage);
  const [tags, setTags] = useState(post.tags.join(", "));
  const [authorName, setAuthorName] = useState(post.authorName);
  const [content, setContent] = useState(post.content);
  const [status, setStatus] = useState(post.status);
  const [saving, setSaving] = useState<"" | "draft" | "publish">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(nextStatus: "draft" | "published") {
    setSaving(nextStatus === "published" ? "publish" : "draft");
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          coverImage,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          authorName,
          content,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus(data.status);
      if (data.slug) setSlug(data.slug);
      setMsg({
        ok: true,
        text: nextStatus === "published" ? "Published live." : "Draft saved.",
      });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving("");
    }
  }

  async function remove() {
    if (!confirm("Delete this post permanently?")) return;
    const res = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) window.location.href = "/admin/blog";
  }

  const field = "h-11 w-full rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none focus:border-foreground";

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/blog" className="text-[13px] text-muted-foreground underline">
            ← All posts
          </Link>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
            }`}
          >
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === "published" && (
            <a href={`/blog/${slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-border-strong px-3 py-1.5 text-[13px] hover:border-foreground">
              View live ↗
            </a>
          )}
          <button
            onClick={() => save("draft")}
            disabled={!!saving}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-[13px] hover:border-foreground disabled:opacity-50"
          >
            {saving === "draft" ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={() => save("published")}
            disabled={!!saving}
            className="rounded-lg bg-foreground px-4 py-1.5 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {saving === "publish" ? "Publishing…" : status === "published" ? "Update" : "Publish"}
          </button>
        </div>
      </header>

      {msg && (
        <div className={`mt-4 rounded-lg px-4 py-2.5 text-[13px] ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="How to convert a Framer site to Next.js" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Slug</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className={field} placeholder="auto from title" />
            <p className="mt-1 text-[11.5px] text-muted-foreground">/blog/{slug || "…"}</p>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Author</label>
            <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} className={field} placeholder="The Framer → Next.js team" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Excerpt (SEO description)</label>
          <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={field} placeholder="One-sentence summary shown in search results and social cards." />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Cover image URL</label>
            <input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className={field} placeholder="https://…" />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} placeholder="framer, next.js, seo" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
            Content — Markdown (# heading, **bold**, [link](url), lists, ```code```)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={22}
            spellCheck
            className="w-full rounded-lg border border-border-strong bg-background px-3.5 py-3 font-mono text-[13.5px] leading-relaxed outline-none focus:border-foreground"
            placeholder={"# Your headline\n\nWrite your post in Markdown. Link to your tools like the [Hybrid converter](/) and [Pure Next.js export](/nextjs)."}
          />
        </div>

        <div className="flex justify-between border-t border-border pt-4">
          <button onClick={remove} className="text-[13px] text-red-600 hover:underline">
            Delete post
          </button>
          <span className="text-[12px] text-muted-foreground">Markdown · {content.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </div>
    </div>
  );
}
