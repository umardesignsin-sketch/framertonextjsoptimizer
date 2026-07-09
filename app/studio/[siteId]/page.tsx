import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";
import type { DesignDoc } from "@/lib/design/types";
import { defaultDoc } from "@/lib/design/types";
import { StudioClient } from "./StudioClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StudioPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  if (!dbConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Set <code>DATABASE_URL</code> to use the studio.
        </p>
      </div>
    );
  }

  const user = await requireUser();
  if (!user) redirect(`/login?next=/studio/${siteId}`);

  const site = await db.site.findFirst({ where: { id: siteId, ownerId: user.id } });
  if (!site) notFound();

  const doc = (site.designTree as DesignDoc | null) || defaultDoc();

  return <StudioClient siteId={site.id} siteName={site.name} initialDoc={doc} />;
}
