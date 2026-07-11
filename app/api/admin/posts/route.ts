// Founders panel — blog post collection API. Admin-session gated.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin-auth";
import { db, dbConfigured } from "@/lib/db";
import { slugify } from "@/lib/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return isValidSession(jar.get(ADMIN_COOKIE)?.value);
}

/** Ensure a unique slug, appending -2, -3, … if needed. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "post";
  let slug = root;
  for (let i = 2; i < 100; i++) {
    const clash = await db.post.findFirst({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// GET /api/admin/posts — list all posts (drafts + published).
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const posts = await db.post.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, status: true, publishedAt: true, updatedAt: true },
  });
  return NextResponse.json({ posts });
}

// POST /api/admin/posts — create a draft.
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty create is fine */
  }
  const title = (body.title || "Untitled post").trim() || "Untitled post";
  const slug = await uniqueSlug(title);
  const post = await db.post.create({
    data: { title, slug, content: "", status: "draft" },
    select: { id: true },
  });
  return NextResponse.json({ id: post.id });
}
