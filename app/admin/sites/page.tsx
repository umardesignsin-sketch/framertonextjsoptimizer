import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { listSites } from "@/lib/sites";
import { SitesList } from "./SitesList";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SitesPage() {
  if (!dbConfigured()) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/admin" className="text-[13px] underline">
          ← Admin
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Sites</h1>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Set <code>DATABASE_URL</code> (and run migrations) to use Sites + the Framer CMS import.
        </p>
      </div>
    );
  }

  const sites = await listSites();
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/admin" className="text-[13px] underline">
        ← Admin
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Sites</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Connect a site&apos;s Framer project to mirror its CMS collections here — edit content in this
        admin panel from then on.
      </p>
      <SitesList
        initialSites={sites.map((s) => ({
          id: s.id,
          name: s.name,
          framerUrl: s.framerUrl,
          cmsStatus: s.cms?.status ?? null,
          collectionCount: s.cms?.collections.length ?? 0,
        }))}
      />
    </div>
  );
}
