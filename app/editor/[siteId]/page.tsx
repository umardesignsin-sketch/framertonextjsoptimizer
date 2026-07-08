import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";
import type { EditorEdit } from "@/lib/overrides";
import { getJob } from "@/lib/store";
import { EditorClient } from "./EditorClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditorPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  if (!dbConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Set <code>DATABASE_URL</code> to use the editor.
        </p>
      </div>
    );
  }

  const user = await requireUser();
  if (!user) redirect(`/login?next=/editor/${siteId}`);

  const site = await db.site.findFirst({
    where: { id: siteId, ownerId: user.id },
    include: { deployments: { orderBy: { createdAt: "desc" } } },
  });
  if (!site) notFound();

  if (!site.themeRef) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-lg font-semibold">Nothing to edit yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This site has no converted bundle.{" "}
          <Link href="/" className="underline">
            Convert it first
          </Link>
          .
        </p>
      </div>
    );
  }

  const canPublish = site.deployments.some((d) => !!d.tokenEnc && !!d.externalId);
  const initialEdits = (site.draftEdits as EditorEdit[] | null) || [];

  // Page list for the Pages panel (falls back to just Home if the bundle
  // expired from the cache). Each route maps to a preview path.
  const previewBase = `/api/preview/${site.themeRef}/`;
  let pages: { route: string; path: string }[] = [{ route: "/", path: previewBase }];
  try {
    const job = await getJob(site.themeRef);
    if (job?.report.pages?.length) {
      pages = job.report.pages.map((p) => {
        const r = p.route || "/";
        const path = r === "/" ? previewBase : previewBase + r.replace(/^\/+/, "").replace(/\/?$/, "/");
        return { route: r, path };
      });
    }
  } catch {
    /* keep default */
  }

  return (
    <EditorClient
      siteId={site.id}
      siteName={site.name}
      previewBase={previewBase}
      pages={pages}
      initialEdits={initialEdits}
      canPublish={canPublish}
    />
  );
}
