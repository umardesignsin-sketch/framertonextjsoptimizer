import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConfigured } from "@/lib/db";
import { getSiteWithCms } from "@/lib/sites";
import { SiteDetail } from "./SiteDetail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured()) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/admin/sites" className="text-[13px] underline">
          ← Sites
        </Link>
        <p className="mt-4 text-[13px] text-muted-foreground">
          Set <code>DATABASE_URL</code> to use this page.
        </p>
      </div>
    );
  }

  const { id } = await params;
  const site = await getSiteWithCms(id);
  if (!site) notFound();

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/admin/sites" className="text-[13px] underline">
        ← Sites
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{site.name}</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">{site.framerUrl}</p>

      <SiteDetail
        siteId={site.id}
        cms={
          site.cms
            ? {
                projectUrl: site.cms.projectUrl,
                status: site.cms.status,
                error: site.cms.error,
                lastSyncedAt: site.cms.lastSyncedAt ? site.cms.lastSyncedAt.toISOString() : null,
                collections: site.cms.collections.map((c) => ({
                  id: c.id,
                  name: c.name,
                  fields: c.fields as unknown as { id: string; name: string; type: string }[],
                  items: c.items.map((it) => ({
                    id: it.id,
                    slug: it.slug,
                    data: it.data as unknown as Record<string, unknown>,
                  })),
                })),
              }
            : null
        }
      />
    </div>
  );
}
