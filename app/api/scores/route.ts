import { NextResponse } from "next/server";
import { fetchScores } from "@/lib/pagespeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/scores  { url } -> { performance, seo } from PageSpeed.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const url = typeof body?.url === "string" ? body.url : "";
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  try {
    const scores = await fetchScores(url);
    return NextResponse.json(scores);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PageSpeed failed" },
      { status: 502 }
    );
  }
}
