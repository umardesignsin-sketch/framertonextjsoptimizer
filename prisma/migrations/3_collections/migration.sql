-- Framer CMS Collections detected in converted sites (blog posts, portfolio
-- items, etc.) — see lib/collections-detect.ts / lib/collections-render.ts.
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "routePrefix" TEXT NOT NULL,
    "templateSourcePath" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "listingRoute" TEXT,
    "listingCardTemplate" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "sourceRoute" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Collection_siteId_routePrefix_key" ON "Collection"("siteId", "routePrefix");
CREATE INDEX "Collection_siteId_idx" ON "Collection"("siteId");

CREATE UNIQUE INDEX "CollectionItem_collectionId_slug_key" ON "CollectionItem"("collectionId", "slug");
CREATE INDEX "CollectionItem_collectionId_idx" ON "CollectionItem"("collectionId");

ALTER TABLE "Collection" ADD CONSTRAINT "Collection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
