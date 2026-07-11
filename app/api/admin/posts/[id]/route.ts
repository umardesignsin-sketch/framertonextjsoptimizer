// Founders panel — single blog post API (get/update/delete). Admin-gated.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin-auth";
import { db, dbConfigured } from "@/lib/db";
import { slugify, DEFAULT_AUTHOR } from "@/lib/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return isValidSession(jar.get(ADMIN_COOKIE)?.value);
}

async function uniqueSlug(base: string, excludeId: string): Promise<string> {
  const root = slugify(base) || "post";
  let slug = root;
  for (let i = 2; i < 100; i++) {
    const clash = await db.post.findFirst({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await db.post.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
    tags?: string[];
    authorName?: string;
    status?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? existing.title).trim() || "Untitled post";
  const slugSource = body.slug && body.slug.trim() ? body.slug : title;
  const slug = await uniqueSlug(slugSource, id);
  const status = body.status === "published" ? "published" : "draft";
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
    : existing.tags;

  // Stamp publishedAt the first time it goes live; keep it thereafter.
  const publishedAt =
    status === "published" ? existing.publishedAt ?? new Date() : existing.publishedAt;

  const post = await db.post.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt: (body.excerpt ?? existing.excerpt ?? "") || null,
      content: body.content ?? existing.content,
      coverImage: (body.coverImage ?? existing.coverImage ?? "") || null,
      tags,
      authorName: (body.authorName ?? existing.authorName ?? DEFAULT_AUTHOR) || DEFAULT_AUTHOR,
      status,
      publishedAt,
    },
  });
  return NextResponse.json({ ok: true, slug: post.slug, status: post.status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.post.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
