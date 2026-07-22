import { headers } from "next/headers";
import { db, dbConfigured } from "@/lib/db";
import { listJobs } from "@/lib/store";
import { AdminDashboard, type AdminJob } from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  // Conversions come from Postgres (every conversion writes a Site row via
  // recordConversion), NOT from blob-store metadata sidecars — so the list
  // keeps working through storage outages/pauses and can say who converted
  // what. Blob metas remain only as a fallback when the DB isn't configured.
  let jobs: AdminJob[] = [];
  if (dbConfigured()) {
    try {
      const sites = await db.site.findMany({
        where: { themeRef: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { owner: { select: { email: true } } },
      });
      jobs = sites.map((s) => ({
        id: s.themeRef!,
        sourceUrl: s.framerUrl,
        createdAt: +s.createdAt,
        outputKind: s.outputKind,
        ownerEmail: s.owner?.email || "—",
      }));
    } catch {
      /* fall through to blob metas */
    }
  }
  if (jobs.length === 0) {
    jobs = (await listJobs().catch(() => [])).map((m) => ({
      id: m.id,
      sourceUrl: m.sourceUrl,
      createdAt: m.createdAt,
      outputKind: "hybrid",
      ownerEmail: "—",
    }));
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return <AdminDashboard jobs={jobs} baseUrl={baseUrl} />;
}
