// Signup attribution: derive a human "source" from first-touch data and
// persist it once per user. Server-only (uses Prisma).
import { db, dbConfigured } from "./db";

const COOKIE = "fno_attr";

interface Attr {
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  landingPath?: string;
}

/** Collapse first-touch data into a single readable source label. */
function deriveSource(a: Attr): string {
  if (a.source) return a.source; // explicit utm_source wins
  const ref = (a.referrer || "").trim();
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (/google\./.test(host)) return "google (organic)";
    if (/bing\./.test(host)) return "bing (organic)";
    if (/duckduckgo\./.test(host)) return "duckduckgo";
    if (/t\.co|twitter\.com|x\.com/.test(host)) return "twitter/x";
    if (/reddit\.com/.test(host)) return "reddit";
    if (/news\.ycombinator|ycombinator/.test(host)) return "hacker news";
    if (/producthunt\.com/.test(host)) return "product hunt";
    if (/linkedin\.com|lnkd\.in/.test(host)) return "linkedin";
    if (/github\.com/.test(host)) return "github";
    if (/npmjs\.com/.test(host)) return "npm";
    return host;
  } catch {
    return "direct";
  }
}

function parseCookie(raw: string | undefined): Attr {
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw)) as Attr;
  } catch {
    return {};
  }
}

/**
 * Record signup attribution the first time we see a user. Idempotent —
 * skips if a row already exists (first touch wins over later logins).
 * Never throws; attribution is best-effort telemetry, not critical path.
 */
export async function captureSignup(
  userId: string,
  opts: { cookie?: string; country?: string | null }
): Promise<void> {
  if (!dbConfigured() || !userId) return;
  try {
    const existing = await db.signupMeta.findUnique({ where: { userId }, select: { userId: true } });
    if (existing) return;
    const a = parseCookie(opts.cookie);
    await db.signupMeta.create({
      data: {
        userId,
        country: opts.country?.toUpperCase() || null,
        source: deriveSource(a),
        medium: a.medium || null,
        campaign: a.campaign || null,
        referrer: a.referrer || null,
        landingPath: a.landingPath || null,
      },
    });
  } catch {
    /* best-effort — a duplicate race or DB hiccup must not break sign-in */
  }
}

/** Fetch attribution for a set of user ids (admin dashboard). */
export async function signupMetaFor(userIds: string[]): Promise<Map<string, { country: string | null; source: string | null }>> {
  const map = new Map<string, { country: string | null; source: string | null }>();
  if (!dbConfigured() || userIds.length === 0) return map;
  try {
    const rows = await db.signupMeta.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, country: true, source: true },
    });
    for (const r of rows) map.set(r.userId, { country: r.country, source: r.source });
  } catch {
    /* ignore */
  }
  return map;
}

export const ATTR_COOKIE = COOKIE;
