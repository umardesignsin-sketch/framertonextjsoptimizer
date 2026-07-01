// Persists a one-way snapshot of a site's connected Framer CMS into our DB.
// Safe to re-run: collections/items are upserted by their Framer id, so a
// re-sync just refreshes our copy (never writes back to Framer).
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { decryptSecret, encryptSecret } from "./crypto";
import { fetchFramerCms } from "./framer-cms";

/** Stores (or replaces) the Framer CMS connection for a site. Does not import yet. */
export async function saveCmsConnection(siteId: string, projectUrl: string, apiKey: string) {
  const apiKeyEnc = encryptSecret(apiKey);
  return db.cmsConnection.upsert({
    where: { siteId },
    create: { siteId, projectUrl, apiKeyEnc },
    update: { projectUrl, apiKeyEnc, status: "idle", error: null },
  });
}

export interface CmsImportResult {
  collections: number;
  items: number;
}

/** Fetches the site's Framer CMS and upserts it into Collection/CollectionItem. */
export async function runCmsImport(siteId: string): Promise<CmsImportResult> {
  const conn = await db.cmsConnection.findUnique({ where: { siteId } });
  if (!conn) throw new Error("This site has no Framer CMS connection yet");

  await db.cmsConnection.update({
    where: { id: conn.id },
    data: { status: "syncing", error: null },
  });

  try {
    const apiKey = decryptSecret(conn.apiKeyEnc);
    const snapshot = await fetchFramerCms(conn.projectUrl, apiKey);

    let itemCount = 0;
    for (const col of snapshot) {
      const collection = await db.collection.upsert({
        where: { connectionId_framerId: { connectionId: conn.id, framerId: col.framerId } },
        create: {
          connectionId: conn.id,
          framerId: col.framerId,
          name: col.name,
          fields: col.fields as unknown as Prisma.InputJsonValue,
        },
        update: { name: col.name, fields: col.fields as unknown as Prisma.InputJsonValue },
      });

      for (const item of col.items) {
        await db.collectionItem.upsert({
          where: { collectionId_framerId: { collectionId: collection.id, framerId: item.framerId } },
          create: {
            collectionId: collection.id,
            framerId: item.framerId,
            slug: item.slug,
            data: item.data as unknown as Prisma.InputJsonValue,
          },
          update: { slug: item.slug, data: item.data as unknown as Prisma.InputJsonValue },
        });
        itemCount++;
      }
    }

    await db.cmsConnection.update({
      where: { id: conn.id },
      data: { status: "synced", lastSyncedAt: new Date(), error: null },
    });
    return { collections: snapshot.length, items: itemCount };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    await db.cmsConnection.update({ where: { id: conn.id }, data: { status: "error", error: message } });
    throw new Error(message);
  }
}
