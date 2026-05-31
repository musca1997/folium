import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith("scrypt$")) {
    const [, salt, key] = stored.split("$");
    if (!salt || !key) return false;
    const actual = Buffer.from(scryptSync(password, salt, KEY_LENGTH).toString("hex"));
    const expected = Buffer.from(key);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  // Legacy v0.1 SHA-256 hashes. Successful logins are upgraded by lib/auth.ts.
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  const legacy = createHash("sha256").update(password).digest("hex");
  return legacy === stored;
}

export function isLegacyPasswordHash(stored: string): boolean {
  return !stored.startsWith("scrypt$");
}
