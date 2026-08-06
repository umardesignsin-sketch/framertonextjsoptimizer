// PATCH /api/account/profile { name, workspaceName } — updates the caller's
// own Prisma User row. Email is intentionally not editable here: changing it
// requires Supabase's own re-verification flow, which is out of scope.
import { getAuthUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });
  const authed = await getAuthUser();
  if (!authed?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; workspaceName?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : undefined;
  const workspaceName =
    typeof body.workspaceName === "string" ? body.workspaceName.trim().slice(0, 120) : undefined;

  if (name === "" || workspaceName === "") {
    return Response.json({ error: "Name and workspace are required." }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: authed.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(workspaceName !== undefined ? { workspaceName } : {}),
    },
    select: { name: true, workspaceName: true },
  });

  return Response.json({ ok: true, user });
}
