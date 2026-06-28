// TEMP diagnostic: verify Blob round-trip + auth on the live deployment.
// Remove after the "Job expired" fix is confirmed.
import { put, get, del } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    BLOB_STORE_ID: !!process.env.BLOB_STORE_ID,
    VERCEL_OIDC_TOKEN: !!process.env.VERCEL_OIDC_TOKEN,
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
  };
  const path = "jobs/_selftest.json";
  try {
    await put(path, JSON.stringify({ ok: true, t: Date.now() }), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    const r = await get(path, { access: "private" });
    const body = r && r.statusCode === 200 && r.stream ? await new Response(r.stream).text() : null;
    await del(path).catch(() => {});
    return Response.json({ env, putGet: "OK", readBack: body });
  } catch (e) {
    return Response.json(
      { env, putGet: "FAILED", error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) },
      { status: 500 }
    );
  }
}
