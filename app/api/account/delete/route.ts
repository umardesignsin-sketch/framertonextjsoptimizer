// DELETE /api/account/delete { confirm: "DELETE" } — permanently removes the
// caller's account: Prisma User row (cascades Sites -> Deployments), then the
// Supabase auth user itself via the service-role admin client. Irreversible.
import { getAuthUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";
import { createSupabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });
  const authed = await getAuthUser();
  if (!authed?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { confirm?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body.confirm !== "DELETE") {
    return Response.json({ error: "Confirmation text did not match." }, { status: 400 });
  }

  await db.user.delete({ where: { id: authed.id } }).catch((e) => {
    // Row may already be gone (e.g. a retry) — treat as success either way.
    if (e?.code !== "P2025") throw e;
  });

  if (supabaseAdminConfigured()) {
    const admin = createSupabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(authed.id);
    // Prisma data is already gone at this point; surface the auth-side
    // failure so the caller knows the login can technically still work.
    if (error) {
      return Response.json(
        { ok: true, warning: `Account data deleted, but auth removal failed: ${error.message}` },
        { status: 200 }
      );
    }
  }

  return Response.json({ ok: true });
}
