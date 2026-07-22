import Link from "next/link";
import { createSupabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { db, dbConfigured } from "@/lib/db";
import { signupMetaFor } from "@/lib/attribution";

/** ISO 3166-1 alpha-2 → flag emoji (regional indicator pair). */
function flag(cc: string): string {
  if (!/^[A-Za-z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Signup {
  id: string;
  email: string;
  provider: string;
  verified: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

async function loadSignups(): Promise<Signup[]> {
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

/** Count signups within the last N days. Kept out of component render so the
 *  clock read isn't flagged as impure. */
function countRecent(signups: Signup[], days: number): number {
  const cutoff = Date.now() - days * 864e5;
  return signups.filter((s) => new Date(s.createdAt).getTime() >= cutoff).length;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default async function AdminUsersPage() {
  if (!supabaseAdminConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center text-sm text-muted-foreground">
        Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to view signups.
      </div>
    );
  }

  const signups = await loadSignups().catch(() => []);

  // Sites converted per user (engagement signal).
  const siteCounts = new Map<string, number>();
  if (dbConfigured()) {
    try {
      const grouped = await db.site.groupBy({ by: ["ownerId"], _count: { _all: true } });
      for (const g of grouped) siteCounts.set(g.ownerId, g._count._all);
    } catch {
      /* ignore */
    }
  }

  // First-touch attribution (country + source) per signup.
  const attr = await signupMetaFor(signups.map((s) => s.id));

  const total = signups.length;
  const verified = signups.filter((s) => s.verified).length;
  const last7 = countRecent(signups, 7);

  // Top acquisition source among users we have attribution for.
  const sourceCounts = new Map<string, number>();
  for (const s of signups) {
    const src = attr.get(s.id)?.source;
    if (src) sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
  }
  const topSource = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const stats = [
    ["Total signups", total],
    ["New (7 days)", last7],
    ["Verified", verified],
    ["Top source", topSource ? `${topSource[0]} (${topSource[1]})` : "—"],
  ] as const;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[13px] text-muted-foreground underline">← Founders panel</Link>
          <h1 className="text-2xl font-semibold">Signups</h1>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <div className="text-2xl font-semibold">{value}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-foreground/5 text-left text-[12px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Method</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Country</th>
              <th className="px-4 py-2.5 font-medium">Sites</th>
              <th className="px-4 py-2.5 font-medium">Signed up</th>
              <th className="px-4 py-2.5 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {signups.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No signups yet.</td>
              </tr>
            ) : (
              signups.map((s) => {
                const a = attr.get(s.id);
                return (
                <tr key={s.id}>
                  <td className="px-4 py-2.5">{s.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full border border-border-strong px-2 py-0.5 text-[11px] capitalize">{s.provider}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {a?.source ? <span className="text-foreground">{a.source}</span> : "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {a?.country ? (
                      <span title={a.country}>{flag(a.country)} {a.country}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{siteCounts.get(s.id) ?? 0}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmt(s.createdAt)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmt(s.lastSignInAt)}</td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
