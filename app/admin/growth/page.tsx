import { supabaseAdminConfigured } from "@/lib/supabase/admin";
import { signupMetaFor, type SignupMetaRow } from "@/lib/attribution";
import { loadAllSignups, flag, countRecent, countActive } from "@/lib/admin-signups";
import { AdminHeader } from "../AdminHeader";
import { Icon } from "../icons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AI_SOURCE_RE = /\(ai\)$/;

function groupCount<T>(items: T[], keyOf: (item: T) => string | null | undefined): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function StatCard({ icon, label, value, hint }: { icon: string; label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon name={icon} size={13} />
        <span className="text-[11.5px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Horizontal bar breakdown — label, count, and a proportional bar relative
 *  to the largest count in the list. */
function BreakdownCard({
  title,
  icon,
  rows,
  total,
  renderLabel,
  emptyText,
}: {
  title: string;
  icon: string;
  rows: [string, number][];
  total: number;
  renderLabel?: (key: string) => React.ReactNode;
  emptyText: string;
}) {
  const max = rows[0]?.[1] || 1;
  return (
    <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        <Icon name={icon} size={14} className="text-muted-foreground" />
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 10).map(([key, count]) => (
            <li key={key}>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="truncate text-foreground">{renderLabel ? renderLabel(key) : key}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {count} <span className="text-[11px]">({Math.round((count / total) * 100)}%)</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(4, Math.round((count / max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function AdminGrowthPage() {
  if (!supabaseAdminConfigured()) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AdminHeader />
        <div className="mx-auto max-w-2xl px-5 py-16 text-center text-sm text-muted-foreground">
          Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to view growth data.
        </div>
      </div>
    );
  }

  const signups = await loadAllSignups().catch(() => []);
  const attr = await signupMetaFor(signups.map((s) => s.id));
  const metaRows: SignupMetaRow[] = signups.map((s) => attr.get(s.id)).filter((m): m is SignupMetaRow => !!m);
  const withAttr = metaRows.length;

  // Growth
  const newToday = countRecent(signups, 1);
  const new7d = countRecent(signups, 7);
  const new30d = countRecent(signups, 30);
  const dau = countActive(signups, 1);
  const wau = countActive(signups, 7);
  const mau = countActive(signups, 30);

  // Attribution breakdowns (only over users we have first-touch data for —
  // older signups predate this tracking and are correctly excluded, not
  // guessed at).
  const sources = groupCount(metaRows, (m) => m.source);
  const aiSources = sources.filter(([k]) => AI_SOURCE_RE.test(k));
  const aiTotal = aiSources.reduce((n, [, c]) => n + c, 0);
  const countries = groupCount(metaRows, (m) => m.country);
  const devices = groupCount(metaRows, (m) => m.device);
  const browsers = groupCount(metaRows, (m) => m.browser);
  const oses = groupCount(metaRows, (m) => m.os);

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Growth</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {withAttr} of {signups.length} signups have first-touch attribution (tracking started{" "}
          {signups.length - withAttr > 0 ? "recently — older signups predate it" : "before your first signup"}).
        </p>

        {/* New users */}
        <h2 className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">New users</h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <StatCard icon="spark" label="Last 24h" value={newToday} />
          <StatCard icon="spark" label="Last 7 days" value={new7d} />
          <StatCard icon="spark" label="Last 30 days" value={new30d} />
        </div>

        {/* Active users */}
        <h2 className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Active users <span className="normal-case text-muted-foreground/70">(based on last sign-in, not event tracking)</span>
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <StatCard icon="users" label="DAU" value={dau} hint="signed in, last 24h" />
          <StatCard icon="users" label="WAU" value={wau} hint="signed in, last 7d" />
          <StatCard icon="users" label="MAU" value={mau} hint="signed in, last 30d" />
        </div>

        {/* AI referral callout */}
        <h2 className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          AI answer engines
        </h2>
        <div className="mt-2 rounded-2xl border border-border bg-background p-4 sm:p-5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <Icon name="bot" size={14} className="text-muted-foreground" />
            Signups referred from an AI engine
            <span className="ml-auto text-[20px] font-semibold tabular-nums text-accent">{aiTotal}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Detected from the referrer when a user clicked through from ChatGPT, Claude, Gemini, Perplexity, or
            Grok — an AI engine that strips the referrer (some in-app browsers do) is indistinguishable from
            &ldquo;direct,&rdquo; so this is a floor, not an exact count.
          </p>
          {aiSources.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {aiSources.map(([k, c]) => (
                <li key={k} className="rounded-full bg-accent/10 px-2.5 py-1 text-[12px] font-medium text-accent">
                  {k.replace(AI_SOURCE_RE, "")} · {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Source + country breakdowns */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <BreakdownCard
            title="Signup sources"
            icon="compass"
            rows={sources}
            total={withAttr}
            emptyText="No attribution data yet."
          />
          <BreakdownCard
            title="Countries"
            icon="globe"
            rows={countries}
            total={withAttr}
            renderLabel={(cc) => (
              <span>
                {flag(cc)} {cc}
              </span>
            )}
            emptyText="No country data yet."
          />
        </div>

        {/* Device / Browser / OS */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <BreakdownCard title="Device" icon="monitor" rows={devices} total={withAttr} emptyText="No device data yet." />
          <BreakdownCard title="Browser" icon="globe" rows={browsers} total={withAttr} emptyText="No browser data yet." />
          <BreakdownCard title="OS" icon="monitor" rows={oses} total={withAttr} emptyText="No OS data yet." />
        </div>
      </div>
    </div>
  );
}
