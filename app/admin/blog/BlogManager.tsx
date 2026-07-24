"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminHeader } from "../AdminHeader";
import { Icon } from "../icons";

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

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        status === "published" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
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
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-5 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Blog</h1>
          <button
            onClick={newPost}
            disabled={creating}
            className="rounded-lg bg-accent px-4 py-1.5 text-[13px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {creating ? "Creating…" : "+ New post"}
          </button>
        </div>

        <p className="mt-2 text-[13px] text-muted-foreground">
          Posts publish to{" "}
          <a href="/blog" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">
            /blog
          </a>{" "}
          and are added to the sitemap automatically. Write in Markdown.
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-background p-4 sm:p-5">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No posts yet. Hit <span className="font-medium text-foreground">+ New post</span> to write your first.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((p) => (
                <li key={p.id} className="rounded-xl border border-border p-3 transition-colors hover:bg-muted/30">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/blog/${p.id}`} className="truncate text-[13.5px] font-medium text-foreground hover:underline">
                          {p.title}
                        </Link>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        /blog/{p.slug} · updated {fmt(p.updatedAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-[12.5px]">
                      {p.status === "published" && (
                        <a
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Icon name="external" size={11} /> View
                        </a>
                      )}
                      <Link href={`/admin/blog/${p.id}`} className="flex items-center gap-1 text-accent hover:text-accent-hover">
                        <Icon name="pencil" size={11} /> Edit
                      </Link>
                      <button
                        onClick={() => remove(p.id, p.title)}
                        disabled={busyId === p.id}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 disabled:opacity-50"
                      >
                        <Icon name="trash" size={11} />
                        {busyId === p.id ? "…" : ""}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
