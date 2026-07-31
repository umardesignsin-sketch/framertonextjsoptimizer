// PATCH /api/account/notifications { notifyConversion?, notifyDeployment?, notifyProduct? }
// Saves real preference state on the caller's User row. No email provider is
// configured yet, so these don't trigger delivery — they persist the user's
// choice so it's honored the moment sending is wired up.
import { getAuthUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });
  const authed = await getAuthUser();
  if (!authed?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { notifyConversion?: boolean; notifyDeployment?: boolean; notifyProduct?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, boolean> = {};
  if (typeof body.notifyConversion === "boolean") data.notifyConversion = body.notifyConversion;
  if (typeof body.notifyDeployment === "boolean") data.notifyDeployment = body.notifyDeployment;
  if (typeof body.notifyProduct === "boolean") data.notifyProduct = body.notifyProduct;

  const user = await db.user.update({
    where: { id: authed.id },
    data,
    select: { notifyConversion: true, notifyDeployment: true, notifyProduct: true },
  });

  return Response.json({ ok: true, user });
}
