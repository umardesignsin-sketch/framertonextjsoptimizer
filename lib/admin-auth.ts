// Simple single-password gate for the admin panel.
// Set ADMIN_PASSWORD in the environment. The session cookie stores a hash of
// the password (not the password itself); middleware re-derives and compares.
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fno_admin";

export function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD || undefined;
}

/** Deterministic session token derived from the configured password. */
export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`fno-admin:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** True if the provided cookie value matches the current password's token. */
export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  const pw = adminPassword();
  if (!pw || !cookieValue) return false;
  return cookieValue === (await sessionToken(pw));
}

/** For use inside API route handlers (not covered by proxy.ts, which only matches /admin/*). */
export async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return isValidSession(jar.get(ADMIN_COOKIE)?.value);
}
