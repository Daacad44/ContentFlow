/**
 * src/utils/password.ts
 * Password hashing & verification using Argon2id (OWASP-recommended).
 * An optional server-side "pepper" is appended before hashing so a database
 * leak alone is not enough to mount an offline attack.
 */
import argon2 from 'argon2';
import { env } from '../config/env';

const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

const withPepper = (password: string): string => password + env.PASSWORD_PEPPER;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(withPepper(password), ARGON_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, withPepper(password));
  } catch {
    return false;
  }
}

/**
 * Returns true when the stored hash should be re-hashed (e.g. parameters were
 * upgraded). Call after a successful verify to transparently upgrade hashes.
 */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON_OPTIONS);
}
