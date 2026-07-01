import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { dbConfigured } from "@/lib/db";
import { runCmsImport, saveCmsConnection } from "@/lib/cms-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/admin/sites/[id]/cms { projectUrl, apiKey } — connect a Framer
// project's CMS and run the first import.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let body: { projectUrl?: string; apiKey?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const projectUrl = (body.projectUrl || "").trim();
  const apiKey = (body.apiKey || "").trim();
  if (!projectUrl || !apiKey) {
    return NextResponse.json({ error: "'projectUrl' and 'apiKey' are required" }, { status: 400 });
  }

  const { id: siteId } = await params;
  try {
    await saveCmsConnection(siteId, projectUrl, apiKey);
    const result = await runCmsImport(siteId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to connect" },
      { status: 502 }
    );
  }
}
