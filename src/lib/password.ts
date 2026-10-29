import crypto from "node:crypto";

// Ported from smartagriai-main backend/src/utils/auth.ts (scrypt-based).
export function hashPassword(password: string, salt?: string) {
  const passwordSalt = salt || crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto
    .scryptSync(password, passwordSalt, 64)
    .toString("hex");
  return { passwordHash, passwordSalt };
}

export function verifyPassword(
  password: string,
  passwordHash: string,
  passwordSalt: string,
) {
  const candidateHash = crypto.scryptSync(password, passwordSalt, 64);
  const storedHash = Buffer.from(passwordHash, "hex");
  return (
    storedHash.length === candidateHash.length &&
    crypto.timingSafeEqual(storedHash, candidateHash)
  );
}
