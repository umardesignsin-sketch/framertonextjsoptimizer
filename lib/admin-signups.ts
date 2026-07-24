// Shared signup-loading helper for the admin area (Signups list + Growth
// dashboard both need the full user list from Supabase Auth).
import { createSupabaseAdmin } from "./supabase/admin";

export interface Signup {
  id: string;
  email: string;
  provider: string;
  verified: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

export async function loadAllSignups(): Promise<Signup[]> {
  const admin = createSupabaseAdmin();
  const out: Signup[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      const identities = u.identities || [];
      const provider =
        identities.find((i) => i.provider === "google")
          ? "google"
          : identities[0]?.provider || (u.app_metadata?.provider as string) || "email";
      out.push({
        id: u.id,
        email: u.email || "(no email)",
        provider,
        verified: !!u.email_confirmed_at || !!u.confirmed_at,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
      });
    }
    if (data.users.length < 200) break;
  }
  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out;
}

/** ISO 3166-1 alpha-2 → flag emoji (regional indicator pair). */
export function flag(cc: string): string {
  if (!/^[A-Za-z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Count signups whose createdAt falls within the last N days (rolling window). */
export function countRecent(signups: Signup[], days: number): number {
  const cutoff = Date.now() - days * 864e5;
  return signups.filter((s) => new Date(s.createdAt).getTime() >= cutoff).length;
}

/** Count signups whose lastSignInAt falls within the last N days — a rough
 *  activity proxy (DAU/WAU/MAU), not true event-based active-user tracking,
 *  since there's no session/event pipeline in place yet. */
export function countActive(signups: Signup[], days: number): number {
  const cutoff = Date.now() - days * 864e5;
  return signups.filter((s) => s.lastSignInAt && new Date(s.lastSignInAt).getTime() >= cutoff).length;
}
