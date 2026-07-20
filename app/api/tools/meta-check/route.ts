import { NextResponse } from "next/server";
import { checkMetaTags } from "@/lib/meta-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/tools/meta-check  { url } -> MetaCheckResult
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  try {
    const result = await checkMetaTags(url);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fetch failed" },
      { status: 502 }
    );
  }
}
