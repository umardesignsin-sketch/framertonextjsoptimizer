// Links a conversion job to the logged-in user's dashboard ("Sites & conversions").
import { db } from "./db";
import { detectCollections } from "./collections-detect";
import type { ConvertReport } from "./types";

export async function recordConversion(
  ownerId: string,
  params: {
    sourceUrl: string;
    jobId: string;
    outputKind: "hybrid" | "nextjs";
    ogImage?: string;
    /** Hybrid only — used for CMS Collection detection (lib/collections-detect.ts). */
    report?: ConvertReport;
  }
) {
  const name = (() => {
    try {
      return new URL(params.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return params.sourceUrl;
    }
  })();

  const site = await db.site.create({
    data: {
      ownerId,
      name,
      framerUrl: params.sourceUrl,
      outputKind: params.outputKind,
      themeRef: params.jobId,
      previewImage: params.ogImage || null,
      status: "ready",
    },
  });

  // Collection detection is Hybrid-only (see lib/nextjs-export.ts's
  // byte-exact-string constraint) and purely additive — a failure here must
  // never take down the conversion the user is actually waiting on.
  if (params.outputKind === "hybrid" && params.report) {
    try {
      const detected = detectCollections(params.report, (msg) => console.log(`[collections] site ${site.id}: ${msg}`));
      for (const c of detected) {
        await db.collection.create({
          data: {
            siteId: site.id,
            name: c.name,
            routePrefix: c.routePrefix,
            templateSourcePath: c.templateSourcePath,
            fields: c.fields as unknown as object,
            confidence: c.confidence,
            listingRoute: c.listingRoute,
            items: {
              create: c.items.map((item, i) => ({
                slug: item.slug,
                fields: item.fields as unknown as object,
                sourceRoute: item.route,
                order: i,
              })),
            },
          },
        });
      }
    } catch (err) {
      console.error("[collections] detection/persist failed:", err);
    }
  }

  return site;
}
