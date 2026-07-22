// SSRF (server-side request forgery) protection for the converter's
// user-supplied-URL fetches.
//
// The converter fetches whatever URL a caller gives it, server-side. Without a
// guard, that lets an attacker point it at internal-only services, cloud
// metadata endpoints (169.254.169.254 etc.), or use our infrastructure as a
// proxy/port-scanner from its trusted network position. This module refuses
// any request whose host resolves to a private, loopback, link-local, or
// otherwise non-public address — and re-checks on every redirect hop, since a
// public-looking page can 302 to an internal target.
//
// Residual caveat: a determined attacker could exploit DNS rebinding (change
// the record between our resolve and the OS's connect). Fully closing that
// needs a custom connect-time dispatcher, which stock global fetch doesn't
// expose here; resolve-all-addresses + per-hop revalidation closes the
// realistic cases.
import dns from "node:dns/promises";
import net from "node:net";

export class SsrfError extends Error {
  constructor(message = "Refused to fetch a private or disallowed address") {
    super(message);
    this.name = "SsrfError";
  }
}

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata.goog"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp"];

function ipv4Blocked(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0 && p[2] === 0) return true; // 192.0.0.0/24 IETF protocol
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18/15 benchmarking
  if (a >= 224) return true; // 224/4 multicast + 240/4 reserved + 255.255.255.255
  return false;
}

function ipv6Blocked(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true; // unspecified / loopback
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s); // IPv4-mapped
  if (mapped) return ipv4Blocked(mapped[1]);
  if (/^fe[89ab]/.test(s)) return true; // fe80::/10 link-local
  if (/^f[cd]/.test(s)) return true; // fc00::/7 unique-local
  if (s.startsWith("ff")) return true; // ff00::/8 multicast
  return false;
}

/** True if an IP literal is in a private/reserved/non-public range. */
export function ipBlocked(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) return ipv4Blocked(ip);
  if (v === 6) return ipv6Blocked(ip);
  return true; // not a parseable IP → refuse
}

// Cache validated hostnames briefly: a single conversion fetches 100+ assets
// from the same host (framerusercontent.com), so re-resolving each time is
// wasteful. Short TTL keeps the rebinding window small.
const hostCache = new Map<string, number>();
const HOST_TTL_MS = 60_000;

/** Validate a URL is safe to fetch; throws SsrfError otherwise. Returns the parsed URL. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new SsrfError("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new SsrfError("Only http and https URLs are allowed");
  }
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) throw new SsrfError("Missing host");
  if (BLOCKED_HOSTS.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new SsrfError();
  }

  // Literal IP in the URL — validate directly, no DNS.
  if (net.isIP(host)) {
    if (ipBlocked(host)) throw new SsrfError();
    return u;
  }

  const cached = hostCache.get(host);
  if (cached && cached > Date.now()) return u;

  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new SsrfError("Host could not be resolved");
  }
  if (addrs.length === 0) throw new SsrfError("Host could not be resolved");
  for (const a of addrs) {
    if (ipBlocked(a.address)) throw new SsrfError();
  }
  hostCache.set(host, Date.now() + HOST_TTL_MS);
  if (hostCache.size > 500) {
    for (const [k, exp] of hostCache) if (exp < Date.now()) hostCache.delete(k);
  }
  return u;
}

export interface GuardedResponse {
  res: Response;
  /** Final URL after any redirects. */
  url: string;
}

/**
 * SSRF-safe fetch: validates the target, then follows redirects MANUALLY,
 * re-validating each hop (fetch's own redirect:"follow" would chase an
 * attacker's 302 into a private network unchecked).
 */
export async function guardedFetch(
  input: string,
  init: RequestInit = {},
  maxRedirects = 5
): Promise<GuardedResponse> {
  let url = input;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, { ...init, redirect: "manual" });
    const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (loc) {
      if (hop === maxRedirects) throw new SsrfError("Too many redirects");
      url = new URL(loc, url).toString();
      continue;
    }
    return { res, url };
  }
  throw new SsrfError("Too many redirects");
}
