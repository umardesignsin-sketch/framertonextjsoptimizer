// POST /api/convert  { url, options? }
// Streams NDJSON progress events, then a final { type:"done", jobId, report }.
import { convertSite } from "@/lib/convert";
import { makeJobId, saveJob } from "@/lib/store";
import type { ConvertOptions } from "@/lib/types";
import { requireUser } from "@/lib/supabase/user";
import { dbConfigured } from "@/lib/db";
import { recordConversion } from "@/lib/sites";
import { rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  // Converting requires a logged-in account (site + embeds).
  const user = await requireUser();
  if (!user) {
    return Response.json({ error: "Please log in to convert a site." }, { status: 401 });
  }

  const rl = rateLimit(`convert:${user.id}`, 8, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { url?: string; options?: Partial<ConvertOptions> } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const url = (body.url || "").trim();
  if (!url) return Response.json({ error: "Missing 'url'" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const report = await convertSite(url, body.options || {}, (msg) =>
          send({ type: "progress", msg })
        );
        const jobId = makeJobId();
        await saveJob(jobId, report);

        if (dbConfigured()) {
          await recordConversion(user.id, {
            sourceUrl: report.sourceUrl,
            jobId,
            outputKind: "hybrid",
          }).catch(() => {});
        }

        // Slim report for the client (file manifest only, no contents).
        const manifest = report.files.map((f) => ({
          path: f.path,
          bytes: f.binary ? f.binary.length : Buffer.byteLength(f.content || ""),
          kind: f.binary ? "asset" : "html",
        }));
        send({
          type: "done",
          jobId,
          report: {
            sourceUrl: report.sourceUrl,
            pages: report.pages,
            stats: report.stats,
            notes: report.notes,
            manifest,
            totalFiles: report.files.length,
          },
        });
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Conversion failed",
        });
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
