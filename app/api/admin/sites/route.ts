import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { dbConfigured } from "@/lib/db";
import { createSite, listSites } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/sites — list sites.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const sites = await listSites();
  return NextResponse.json({ sites });
}

// POST /api/admin/sites { name, framerUrl } — create a site.
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let body: { name?: string; framerUrl?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = (body.name || "").trim();
  const framerUrl = (body.framerUrl || "").trim();
  if (!name || !framerUrl) {
    return NextResponse.json({ error: "'name' and 'framerUrl' are required" }, { status: 400 });
  }

  const site = await createSite(name, framerUrl);
  return NextResponse.json({ site });
}
