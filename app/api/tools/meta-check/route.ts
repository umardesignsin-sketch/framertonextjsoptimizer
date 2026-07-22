import { NextResponse } from "next/server";
import { checkMetaTags } from "@/lib/meta-check";
import { rateLimit, tooMany, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/tools/meta-check  { url } -> MetaCheckResult
export async function POST(request: Request) {
  // Public + fetches a user URL server-side — cap per IP.
  const rl = rateLimit(`meta:${clientIp(request)}`, 20, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

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
