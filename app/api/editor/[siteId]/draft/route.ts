// GET/PUT /api/editor/[siteId]/draft — load or save the visual editor's
// unpublished draft edits for a site the caller owns.
import { getAuthUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";
import type { EditorEdit } from "@/lib/overrides";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownedSite(siteId: string) {
  const authed = await getAuthUser();
  const userId = authed?.id;
  if (!userId) return { error: "Unauthorized", status: 401 as const };
  const site = await db.site.findFirst({ where: { id: siteId, ownerId: userId } });
  if (!site) return { error: "Not found", status: 404 as const };
  return { site };
}

export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });
  const { siteId } = await params;
  const r = await ownedSite(siteId);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });
  return Response.json({ edits: (r.site.draftEdits as EditorEdit[] | null) || [] });
}

export async function PUT(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });
  const { siteId } = await params;
  const r = await ownedSite(siteId);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });

  let body: { edits?: EditorEdit[] } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const edits = Array.isArray(body.edits) ? body.edits.slice(0, 2000) : [];
  await db.site.update({
    where: { id: siteId },
    data: { draftEdits: edits as unknown as object },
  });
  return Response.json({ ok: true, edits: edits.length });
}
