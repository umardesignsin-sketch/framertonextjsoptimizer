import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { db, dbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/admin/items/[itemId] { data } — edit a mirrored CMS item locally.
// This never writes back to the source Framer project (one-way import).
export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let body: { data?: Record<string, unknown> } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "'data' object is required" }, { status: 400 });
  }

  const { itemId } = await params;
  const item = await db.collectionItem.update({
    where: { id: itemId },
    data: { data: body.data as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json({ item });
}
