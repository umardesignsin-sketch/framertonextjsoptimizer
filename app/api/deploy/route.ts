// POST /api/deploy  { jobId, provider: "netlify"|"vercel", token, name?, teamId? }
import { getJob } from "@/lib/store";
import { deployNetlify, deployVercel } from "@/lib/deploy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: {
    jobId?: string;
    provider?: string;
    token?: string;
    name?: string;
    teamId?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobId, provider, token, name, teamId } = body;
  if (!jobId || !provider || !token) {
    return Response.json(
      { error: "Missing jobId, provider, or token" },
      { status: 400 }
    );
  }
  const job = await getJob(jobId);
  if (!job) {
    return Response.json(
      { error: "Job expired or not found. Re-run the conversion." },
      { status: 404 }
    );
  }

  try {
    const result =
      provider === "netlify"
        ? await deployNetlify(token, job.report.files, name)
        : provider === "vercel"
          ? await deployVercel(token, job.report.files, name, teamId)
          : null;
    if (!result) {
      return Response.json({ error: "Unknown provider" }, { status: 400 });
    }
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Deploy failed" },
      { status: 502 }
    );
  }
}
