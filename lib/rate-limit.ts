// Lightweight in-memory rate limiter.
//
// Fixed-window counter keyed by an arbitrary string (user id for authed
// endpoints, client IP for public ones). Zero dependencies.
//
// Honest limitation: this is PER SERVERLESS INSTANCE. On Vercel, concurrent
// requests can land on different instances, so a determined attacker isn't
// fully capped by this alone — but it meaningfully throttles a single abusive
// client hitting a warm instance, at no infra cost. For hard, distributed
// limits, back this with Upstash/Redis. The convert endpoints are also
// login-gated, which bounds the surface further.
interface Window {
  count: number;
  resetAt: number;
}

const g = globalThis as unknown as { __rlStore?: Map<string, Window> };
const store: Map<string, Window> = (g.__rlStore ??= new Map());

export interface RateResult {
  ok: boolean;
  /** Seconds until the window resets (0 when allowed). */
  retryAfter: number;
  remaining: number;
}

/**
 * Consume one unit for `key`. Allows up to `limit` per `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const w = store.get(key);

  if (!w || now >= w.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 5000) gc(now);
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }

  if (w.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((w.resetAt - now) / 1000), remaining: 0 };
  }

  w.count++;
  return { ok: true, retryAfter: 0, remaining: limit - w.count };
}

function gc(now: number) {
  for (const [k, w] of store) if (now >= w.resetAt) store.delete(k);
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Standard 429 response with a Retry-After header. */
export function tooMany(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, retryAfter)),
    },
  });
}
