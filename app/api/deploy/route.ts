// POST /api/deploy  { jobId, provider: "netlify"|"vercel", token, name?, teamId?, save? }
// `save: true` (opt-in) stores the deploy token encrypted on the Deployment
// row so the AI editor can push future changes to the same live site.
import { getOrRegenerateJob } from "@/lib/store";
import { deployNetlify, deployVercel, toDeployableFiles } from "@/lib/deploy";
import { db, dbConfigured } from "@/lib/db";
import { getAuthUser } from "@/lib/supabase/user";
import { encryptSecret, encryptionConfigured } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generous budget: a cache miss falls back to a full reconversion (see
// getOrRegenerateJob) before the actual deploy even starts.
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: {
    jobId?: string;
    provider?: string;
    token?: string;
    name?: string;
    teamId?: string;
    save?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobId, provider, token, name, teamId, save } = body;
  if (!jobId || !provider || !token) {
    return Response.json(
      { error: "Missing jobId, provider, or token" },
      { status: 400 }
    );
  }
  const job = await getOrRegenerateJob(jobId);
  if (!job) {
    return Response.json(
      { error: "Job expired or not found. Re-run the conversion." },
      { status: 404 }
    );
  }

  try {
    // Pure-Next.js reports render to static HTML here so both hosts deploy
    // them with no build, identical to the hybrid path.
    const files = toDeployableFiles(job.report.files, job.report.previewFiles);
    const result =
      provider === "netlify"
        ? await deployNetlify(token, files, name)
        : provider === "vercel"
          ? await deployVercel(token, files, name, teamId)
          : null;
    if (!result) {
      return Response.json({ error: "Unknown provider" }, { status: 400 });
    }

    if (dbConfigured()) {
      // Only attach the deployment (and optionally the token) to a site the
      // logged-in caller owns — themeRef alone must not leak across users.
      const authed = await getAuthUser().catch(() => null);
      const site = authed?.id
        ? await db.site.findFirst({ where: { themeRef: jobId, ownerId: authed.id } })
        : null;
      if (site) {
        const storeToken = !!save && encryptionConfigured();
        await db.deployment
          .create({
            data: {
              siteId: site.id,
              provider: result.provider,
              status: "ready",
              url: result.url,
              externalId: result.externalId || null,
              tokenEnc: storeToken ? encryptSecret(token) : null,
            },
          })
          .catch(() => {});
      }
    }

    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Deploy failed" },
      { status: 502 }
    );
  }
}
