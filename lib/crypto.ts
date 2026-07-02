// AES-256-GCM helpers for storing secrets (e.g. a user's deploy token) at
// rest. Generate a key with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

function loadKey(): Buffer {
  const k = process.env.ENCRYPTION_KEY;
  if (!k) throw new Error("ENCRYPTION_KEY is not configured");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return buf;
}

export function encryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}

/** Encrypts `plaintext`, returning a single base64 blob (iv + authTag + ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Reverses {@link encryptSecret}. */
export function decryptSecret(encoded: string): string {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", loadKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
