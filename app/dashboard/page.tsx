import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardView } from "./DashboardView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const sites = await db.site.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { deployments: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  return (
    <DashboardView
      email={session!.user.email || ""}
      sites={sites.map((s) => ({
        id: s.id,
        name: s.name,
        framerUrl: s.framerUrl,
        outputKind: s.outputKind,
        status: s.status,
        themeRef: s.themeRef,
        createdAt: s.createdAt.toISOString(),
        deployments: s.deployments.map((d) => ({
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
