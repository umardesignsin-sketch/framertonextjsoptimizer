import { supabaseAdminConfigured } from "@/lib/supabase/admin";
import { db, dbConfigured } from "@/lib/db";
import { signupMetaFor } from "@/lib/attribution";
import { loadAllSignups, flag, countRecent } from "@/lib/admin-signups";
import { AdminHeader } from "../AdminHeader";
import { Icon } from "../icons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Short, non-wrapping date — "Jul 23". Full date+time lives in the title
 *  attribute for anyone who needs it, so nothing forces a 3-line table cell. */
function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}
function fmtFull(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const STAT_ICONS = ["users", "spark", "shield", "compass"] as const;

function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-strong px-2 py-0.5 text-[11px] font-medium capitalize text-foreground">
      {provider}
    </span>
  );
}

export default async function AdminUsersPage() {
  if (!supabaseAdminConfigured()) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AdminHeader />
        <div className="mx-auto max-w-2xl px-5 py-16 text-center text-sm text-muted-foreground">
          Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to view signups.
        </div>
      </div>
    );
  }

  const signups = await loadAllSignups().catch(() => []);

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
    ["Total signups", String(total)],
    ["New (7 days)", String(last7)],
    ["Verified", String(verified)],
    ["Top source", topSource ? `${topSource[0]} (${topSource[1]})` : "—"],
  ] as const;

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Signups</h1>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(([label, value], i) => (
            <div key={label} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon name={STAT_ICONS[i]} size={13} />
                <span className="text-[11.5px] font-medium uppercase tracking-wide">{label}</span>
              </div>
              <div
                className={`mt-1.5 font-semibold text-foreground ${
                  value.length > 10 ? "truncate text-[16px]" : "text-2xl"
                }`}
                title={value}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <section className="mt-5 rounded-2xl border border-border bg-background p-4 sm:p-5">
          {signups.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">No signups yet.</p>
          ) : (
            <>
              {/* Card list — small screens */}
              <ul className="space-y-2 lg:hidden">
                {signups.map((s) => {
                  const a = attr.get(s.id);
                  const sites = siteCounts.get(s.id) ?? 0;
                  return (
                    <li key={s.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-[13.5px] font-medium text-foreground">{s.email}</span>
                        <ProviderBadge provider={s.provider} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                        {a?.source && <span className="text-foreground">{a.source}</span>}
                        {a?.country && (
                          <span>
                            {flag(a.country)} {a.country}
                          </span>
                        )}
                        <span>{sites} site{sites === 1 ? "" : "s"}</span>
                        {s.verified && (
                          <span className="flex items-center gap-0.5 text-emerald-600">
                            <Icon name="check" size={10} /> verified
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3 border-t border-border pt-2 text-[11.5px] text-muted-foreground">
                        <span title={fmtFull(s.createdAt)}>Joined {fmt(s.createdAt)}</span>
                        <span>·</span>
                        <span title={fmtFull(s.lastSignInAt)}>Seen {fmt(s.lastSignInAt)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Table — lg and up */}
              <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
                <table className="w-full text-[13px]">
                  <thead className="border-b border-border bg-muted/60 text-left text-[12px] text-muted-foreground">
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
                    {signups.map((s) => {
                      const a = attr.get(s.id);
                      return (
                        <tr key={s.id} className="transition-colors hover:bg-muted/30">
                          <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-foreground">{s.email}</td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <ProviderBadge provider={s.provider} />
                          </td>
                          <td className="max-w-[140px] truncate px-4 py-2.5 text-muted-foreground">
                            {a?.source ? <span className="text-foreground">{a.source}</span> : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            {a?.country ? (
                              <span title={a.country}>
                                {flag(a.country)} {a.country}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{siteCounts.get(s.id) ?? 0}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground" title={fmtFull(s.createdAt)}>
                            {fmt(s.createdAt)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground" title={fmtFull(s.lastSignInAt)}>
                            {fmt(s.lastSignInAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
