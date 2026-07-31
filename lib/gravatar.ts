import { createHash } from "node:crypto";

/**
 * Gravatar URL for an email — works with zero configuration (no API key,
 * no storage bucket). `d=mp` ("mystery person") renders a neutral silhouette
 * for emails with no registered Gravatar, so the image never 404s.
 */
export function gravatarUrl(email: string, size = 80): string {
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}
