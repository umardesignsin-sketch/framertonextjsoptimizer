// GET /api/download/{jobId} -> zip of the converted static bundle.
import { getOrRegenerateJob } from "@/lib/store";
import { zipBundle } from "@/lib/bundle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generous budget: a cache miss falls back to a full reconversion (see
// getOrRegenerateJob), which can take as long as the original convert call.
export const maxDuration = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getOrRegenerateJob(jobId);
  if (!job) {
    return new Response("Job expired or not found.", { status: 404 });
  }
  const zip = await zipBundle(job.report.files);
  const host = (() => {
    try {
      return new URL(job.report.sourceUrl).hostname.replace(/\./g, "-");
    } catch {
      return "site";
    }
  })();
  return new Response(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${host}-optimized.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
