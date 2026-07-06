// POST /api/editor/[siteId]/publish — apply the site's draft edits to its
// bundle and push them live to the saved deploy target.
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { publishSite } from "@/lib/editor-publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Log in to publish" }, { status: 401 });

  const { siteId } = await params;
  try {
    const result = await publishSite(siteId, userId);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Publish failed" },
      { status: 400 }
    );
  }
}
