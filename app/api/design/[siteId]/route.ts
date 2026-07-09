// GET/PUT /api/design/[siteId] — load or save the Studio design tree for a
// site the caller owns.
import { getAuthUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";
import type { DesignDoc } from "@/lib/design/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownedSite(siteId: string) {
  const authed = await getAuthUser();
  if (!authed?.id) return { error: "Unauthorized", status: 401 as const };
  const site = await db.site.findFirst({ where: { id: siteId, ownerId: authed.id } });
  if (!site) return { error: "Not found", status: 404 as const };
  return { site };
}

export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });
  const { siteId } = await params;
  const r = await ownedSite(siteId);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });
  return Response.json({ doc: (r.site.designTree as DesignDoc | null) || null });
}

export async function PUT(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });
  const { siteId } = await params;
  const r = await ownedSite(siteId);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });

  let body: { doc?: DesignDoc } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.doc || !Array.isArray(body.doc.pages)) {
    return Response.json({ error: "Missing 'doc'" }, { status: 400 });
  }
  await db.site.update({ where: { id: siteId }, data: { designTree: body.doc as unknown as object } });
  return Response.json({ ok: true });
}
