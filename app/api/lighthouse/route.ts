// POST /api/lighthouse { siteId } -> runs a real Google PageSpeed Insights
// audit against the caller's own converted output and persists the scores.
//
// The URL is derived server-side from the owned Site row (never trusted from
// the client) so this can't be used as an open PSI proxy — one call burns a
// real quota unit against our API key.
import { getAuthUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";
import { fetchScores } from "@/lib/pagespeed";
import { rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });
  const authed = await getAuthUser();
  if (!authed?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`lighthouse:${authed.id}`, 10, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { siteId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.siteId) return Response.json({ error: "Missing siteId" }, { status: 400 });

  const site = await db.site.findFirst({
    where: { id: body.siteId, ownerId: authed.id },
    include: { deployments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!site) return Response.json({ error: "Not found" }, { status: 404 });

  // Prefer a real deployment (a truly public URL) over the preview route,
  // which PSI can only reach once this app itself is deployed publicly.
  const liveDeploy = site.deployments.find((d) => !!d.url);
  const origin = new URL(request.url).origin;
  const targetUrl = liveDeploy?.url || (site.themeRef ? `${origin}/api/preview/${site.themeRef}/` : null);
  if (!targetUrl) {
    return Response.json(
      { error: "This project has no deployed or converted output to audit yet." },
      { status: 400 }
    );
  }

  try {
    const scores = await fetchScores(targetUrl, "mobile");
    await db.site.update({
      where: { id: site.id },
      data: {
        lighthousePerformance: scores.performance,
        lighthouseAccessibility: scores.accessibility,
        lighthouseBestPractices: scores.bestPractices,
        lighthouseSeo: scores.seo,
        lighthouseCheckedAt: new Date(),
      },
    });
    return Response.json({ ok: true, url: targetUrl, ...scores, checkedAt: new Date().toISOString() });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "PageSpeed audit failed" },
      { status: 502 }
    );
  }
}
