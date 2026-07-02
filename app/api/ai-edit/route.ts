// POST /api/ai-edit  { siteId, instruction }
// Streams NDJSON progress. Loads the site's converted bundle, has Gemini
// apply the user's instruction as surgical find/replace edits, saves the
// result as a new bundle version, and — if a deploy token was saved — pushes
// the updated files to the SAME live Netlify site / Vercel project.
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { getJob, makeJobId, saveJob } from "@/lib/store";
import { runAiEdit } from "@/lib/ai-edit";
import { geminiConfigured } from "@/lib/gemini";
import { decryptSecret, encryptionConfigured } from "@/lib/crypto";
import { redeployNetlify, redeployVercel } from "@/lib/deploy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!dbConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }
  if (!geminiConfigured()) {
    return Response.json({ error: "AI editing is not configured (missing GEMINI_API_KEY)" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Log in to use AI editing" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { siteId?: string; instruction?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const siteId = (body.siteId || "").trim();
  const instruction = (body.instruction || "").trim();
  if (!siteId || !instruction) {
    return Response.json({ error: "'siteId' and 'instruction' are required" }, { status: 400 });
  }
  if (instruction.length > 2000) {
    return Response.json({ error: "Instruction too long (max 2000 chars)" }, { status: 400 });
  }

  // Ownership check — users can only edit their own sites.
  const site = await db.site.findFirst({
    where: { id: siteId, ownerId: userId },
    include: { deployments: { orderBy: { createdAt: "desc" } } },
  });
  if (!site) return Response.json({ error: "Site not found" }, { status: 404 });
  if (!site.themeRef) {
    return Response.json({ error: "This site has no stored bundle to edit" }, { status: 409 });
  }

  const job = await getJob(site.themeRef);
  if (!job) {
    return Response.json(
      { error: "The stored bundle has expired — re-run the conversion first" },
      { status: 410 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        send({ type: "progress", msg: "Loading site bundle…" });
        const result = await runAiEdit(job.report.files, instruction, (msg) =>
          send({ type: "progress", msg })
        );

        if (result.applied.length === 0) {
          send({
            type: "done",
            applied: 0,
            summary: result.summary || "The AI made no changes.",
            failedEdits: result.failedEdits,
            deployed: false,
          });
          return;
        }

        // Persist the edited bundle as a new version and point the site at it.
        send({ type: "progress", msg: `Applied ${result.applied.length} edit(s), saving new version…` });
        const newJobId = makeJobId();
        await saveJob(newJobId, { ...job.report, files: result.files });
        await db.site.update({ where: { id: site.id }, data: { themeRef: newJobId } });

        // Redeploy to the same live site if the user saved a deploy token.
        let deployedUrl: string | null = null;
        const target = site.deployments.find((d) => d.tokenEnc && d.externalId);
        if (target && encryptionConfigured()) {
          send({ type: "progress", msg: `Pushing changes live to ${target.provider}…` });
          try {
            const token = decryptSecret(target.tokenEnc!);
            const res =
              target.provider === "netlify"
                ? await redeployNetlify(token, target.externalId!, result.files)
                : await redeployVercel(token, target.externalId!, result.files);
            deployedUrl = res.url;
            await db.deployment.create({
              data: {
                siteId: site.id,
                provider: target.provider,
                status: "ready",
                url: res.url,
                externalId: target.externalId,
                tokenEnc: target.tokenEnc,
              },
            });
          } catch (e) {
            send({
              type: "progress",
              msg: `Live redeploy failed: ${e instanceof Error ? e.message : "unknown error"} (bundle still updated)`,
            });
          }
        }

        send({
          type: "done",
          applied: result.applied.length,
          summary: result.summary,
          failedEdits: result.failedEdits,
          skippedFiles: result.skippedFiles,
          newJobId,
          deployed: !!deployedUrl,
          deployedUrl,
        });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "AI edit failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
