// Server-side auth helpers bridging Supabase Auth ↔ the Prisma User table.
// getAuthUser() reads the current Supabase user; requireUser() also upserts a
// Prisma User row (the FK target for Sites) so app data can reference it.
import { headers } from "next/headers";
import { createSupabaseServer } from "./server";
import { db, dbConfigured } from "../db";

export interface AuthedUser {
  id: string;
  email: string | null;
}

/** For /dashboard, /editor, /studio, proxy.ts already ran a verified
 *  supabase.auth.getUser() (a real network round trip to Supabase's Auth
 *  API) and forwards the result via request headers — reuse it instead of
 *  making that exact same call again here. Routes proxy.ts doesn't cover
 *  (the convert API routes) fall through to the real check below. */
export async function getAuthUser(): Promise<AuthedUser | null> {
  const hdrs = await headers();
  const forwardedId = hdrs.get("x-fno-user-id");
  if (forwardedId) return { id: forwardedId, email: hdrs.get("x-fno-user-email") };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

/** Auth user + guaranteed Prisma User row. Null if not logged in.
 *
 * Every caller of this (dashboard, editor, studio, both convert routes) used
 * to pay for a DB WRITE on every single page load, even though the row is
 * already there and unchanged on every visit after the first. Check first —
 * one indexed read replaces one unconditional write for the entire lifetime
 * of a returning user, and only a genuinely new/changed row hits `upsert`. */
export async function requireUser(): Promise<AuthedUser | null> {
  const u = await getAuthUser();
  if (!u) return null;
  if (dbConfigured()) {
    const existing = await db.user.findUnique({ where: { id: u.id }, select: { email: true } }).catch(() => null);
    if (!existing || existing.email !== u.email) {
      await db.user
        .upsert({ where: { id: u.id }, create: { id: u.id, email: u.email }, update: { email: u.email } })
        .catch(() => {});
    }
  }
  return u;
}
