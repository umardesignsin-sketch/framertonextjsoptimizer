import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";
import { getOrRegenerateJob } from "@/lib/store";
import { ProjectView } from "./ProjectView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ProjectPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  if (!dbConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Set <code>DATABASE_URL</code> to view projects.
        </p>
      </div>
    );
  }

  const user = await requireUser();
  if (!user) redirect(`/login?next=/project/${siteId}`);

  const site = await db.site.findFirst({
    where: { id: siteId, ownerId: user.id },
    include: { deployments: { orderBy: { createdAt: "desc" } } },
  });
  if (!site) notFound();

  // Only attempt this once the conversion actually produced a bundle — a
  // draft/converting/failed site has no themeRef yet, and regenerating a
  // job that never existed would just fail slowly.
  let report: { pages: { route: string }[]; stats: { label: string; before: number; after: number; unit: string }[]; notes: string[] } | null = null;
  if (site.themeRef) {
    const job = await getOrRegenerateJob(site.themeRef).catch(() => undefined);
    if (job) {
      report = {
        pages: job.report.pages.map((p) => ({ route: p.route })),
        stats: job.report.stats,
        notes: job.report.notes,
      };
    }
  }

  return (
    <ProjectView
      site={{
        id: site.id,
        name: site.name,
        framerUrl: site.framerUrl,
        outputKind: site.outputKind,
        themeRef: site.themeRef,
        status: site.status,
        createdAt: site.createdAt.toISOString(),
        updatedAt: site.updatedAt.toISOString(),
      }}
      deployments={site.deployments.map((d) => ({
        id: d.id,
        provider: d.provider,
        status: d.status,
        url: d.url,
        createdAt: d.createdAt.toISOString(),
      }))}
      report={report}
    />
  );
}
