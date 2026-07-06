import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import type { EditorEdit } from "@/lib/overrides";
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

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=/editor/${siteId}`);

  const site = await db.site.findFirst({
    where: { id: siteId, ownerId: session.user.id },
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

  return (
    <EditorClient
      siteId={site.id}
      siteName={site.name}
      previewBase={`/api/preview/${site.themeRef}/`}
      initialEdits={initialEdits}
      canPublish={canPublish}
    />
  );
}
