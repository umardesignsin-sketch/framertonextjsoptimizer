"use client";

import { useState } from "react";
import Link from "next/link";

interface Row {
  id: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export function BlogManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function newPost() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (res.ok && data.id) window.location.href = `/admin/blog/${data.id}`;
      else alert(data.error || "Could not create post");
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[13px] text-muted-foreground underline">
            ← Founders panel
          </Link>
          <h1 className="text-2xl font-semibold">Blog</h1>
        </div>
        <button
          onClick={newPost}
          disabled={creating}
          className="rounded-lg bg-foreground px-4 py-1.5 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {creating ? "Creating…" : "+ New post"}
        </button>
      </header>

      <p className="mt-2 text-[13px] text-muted-foreground">
        Posts publish to{" "}
        <a href="/blog" target="_blank" rel="noreferrer" className="underline">
          /blog
        </a>{" "}
        and are added to the sitemap automatically. Write in Markdown.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            No posts yet. Hit <span className="font-medium text-foreground">+ New post</span> to write your first.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/blog/${p.id}`} className="truncate font-medium hover:underline">
                      {p.title}
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                        p.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    /blog/{p.slug} · updated {fmt(p.updatedAt)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[12.5px]">
                  {p.status === "published" && (
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-muted-foreground underline">
                      View
                    </a>
                  )}
                  <Link href={`/admin/blog/${p.id}`} className="underline">
                    Edit
                  </Link>
                  <button
                    onClick={() => remove(p.id, p.title)}
                    disabled={busyId === p.id}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
