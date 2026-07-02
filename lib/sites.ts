// Links a conversion job to the logged-in user's dashboard ("Sites & conversions").
import { db } from "./db";

export async function recordConversion(
  ownerId: string,
  params: { sourceUrl: string; jobId: string; outputKind: "hybrid" | "nextjs" }
) {
  const name = (() => {
    try {
      return new URL(params.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return params.sourceUrl;
    }
  })();

  return db.site.create({
    data: {
      ownerId,
      name,
      framerUrl: params.sourceUrl,
      outputKind: params.outputKind,
      themeRef: params.jobId,
      status: "ready",
    },
  });
}
