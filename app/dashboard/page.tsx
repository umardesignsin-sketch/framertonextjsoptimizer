import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/supabase/user";
import { DashboardView } from "./DashboardView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/dashboard");

  const sites = await db.site.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { deployments: { orderBy: { createdAt: "desc" }, take: 10 } },
  });

  return (
    <DashboardView
      email={user.email || ""}
      sites={sites.map((s) => ({
        id: s.id,
        name: s.name,
        framerUrl: s.framerUrl,
        outputKind: s.outputKind,
        status: s.status,
        themeRef: s.themeRef,
        createdAt: s.createdAt.toISOString(),
        // Note: only a boolean about the saved token reaches the client —
        // never the (encrypted) token itself.
        canAutoDeploy: s.deployments.some((d) => !!d.tokenEnc && !!d.externalId),
        deployments: s.deployments.slice(0, 5).map((d) => ({
          id: d.id,
          provider: d.provider,
          status: d.status,
          url: d.url,
          createdAt: d.createdAt.toISOString(),
        })),
      }))}
    />
  );
}
