// Interim Site management for the admin panel, ahead of Clerk (Phase 1b).
// Every Site still needs a real owning User row (FK), so admin-created sites
// are owned by a single local placeholder user until real auth lands.
import { db } from "./db";

const LOCAL_ADMIN_USER_ID = "local-admin";

async function ensureLocalAdminUser() {
  await db.user.upsert({
    where: { id: LOCAL_ADMIN_USER_ID },
    create: { id: LOCAL_ADMIN_USER_ID, name: "Admin" },
    update: {},
  });
  return LOCAL_ADMIN_USER_ID;
}

export async function listSites() {
  return db.site.findMany({
    orderBy: { createdAt: "desc" },
    include: { cms: { include: { collections: { include: { _count: { select: { items: true } } } } } } },
  });
}

export async function createSite(name: string, framerUrl: string) {
  const ownerId = await ensureLocalAdminUser();
  return db.site.create({ data: { ownerId, name, framerUrl } });
}

export async function getSiteWithCms(siteId: string) {
  return db.site.findUnique({
    where: { id: siteId },
    include: {
      cms: {
        include: { collections: { include: { items: true }, orderBy: { name: "asc" } } },
      },
    },
  });
}

export async function deleteSite(siteId: string) {
  await db.site.delete({ where: { id: siteId } });
}
