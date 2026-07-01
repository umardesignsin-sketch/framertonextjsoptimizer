import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { dbConfigured } from "@/lib/db";
import { deleteSite, getSiteWithCms } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/sites/[id] — site detail incl. CMS connection + collections/items.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const site = await getSiteWithCms(id);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ site });
}

// DELETE /api/admin/sites/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  await deleteSite(id);
  return NextResponse.json({ ok: true });
}
