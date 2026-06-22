import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Hash a password using Node's native scrypt sync algorithm.
 * Returns a salt:hash string.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const hashToCompare = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(hash), Buffer.from(hashToCompare));
  } catch {
    return false;
  }
}
