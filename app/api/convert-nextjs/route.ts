// POST /api/convert-nextjs  { url }
// Streams NDJSON progress events, then a final { type:"done", jobId, report }.
// Produces a real, deployable Next.js project (downloadable via /api/download).
import { convertToNextJs } from "@/lib/nextjs-export";
import { makeJobId, saveJob } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { url?: string } = {};
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
        const report = await convertToNextJs(url, (msg) => send({ type: "progress", msg }));
        const jobId = makeJobId();
        await saveJob(jobId, report);
        const manifest = report.files.map((f) => ({
          path: f.path,
          bytes: Buffer.byteLength(f.content || ""),
          kind: "code",
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
        send({ type: "error", message: e instanceof Error ? e.message : "Conversion failed" });
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
