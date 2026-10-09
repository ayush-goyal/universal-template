import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 32;

export function hashCaseCode(code: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(code, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyCaseCode(code: string, storedHash: string): boolean {
  const [algorithm, saltHex, hashHex] = storedHash.split(":");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
  return timingSafeEqual(scryptSync(code, salt, KEY_LENGTH), expected);
}
