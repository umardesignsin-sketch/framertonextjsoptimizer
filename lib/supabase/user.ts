// Server-side auth helpers bridging Supabase Auth ↔ the Prisma User table.
// getAuthUser() reads the current Supabase user; requireUser() also upserts a
// Prisma User row (the FK target for Sites) so app data can reference it.
import { createSupabaseServer } from "./server";
import { db, dbConfigured } from "../db";

export interface AuthedUser {
  id: string;
  email: string | null;
}

export async function getAuthUser(): Promise<AuthedUser | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

/** Auth user + guaranteed Prisma User row (upserted). Null if not logged in. */
export async function requireUser(): Promise<AuthedUser | null> {
  const u = await getAuthUser();
  if (!u) return null;
  if (dbConfigured()) {
    await db.user
      .upsert({ where: { id: u.id }, create: { id: u.id, email: u.email }, update: { email: u.email } })
      .catch(() => {});
  }
  return u;
}
