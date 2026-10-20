import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// scrypt from node:crypto: memory-hard, no native add-on to build. N=2^15, r=8 uses 32 MiB
// per hash (OWASP's recommended minimum is N=2^17 at r=8,p=1 for new systems with more RAM
// per request; 2^15 keeps login well under 200 ms on a small serverless function).
const DEFAULT = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 256;

function derive(password: string, salt: Buffer, opts: { N: number; r: number; p: number }): Promise<Buffer> {
  const options: ScryptOptions = { ...opts, maxmem: 256 * opts.N * opts.r };
  return new Promise((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Returns `scrypt:N:r:p:salt:hash` (base64url), safe to put in a .env file. */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error('Use a password of at least 12 characters.');
  if (password.length > MAX_PASSWORD_LENGTH) throw new Error('Password too long.');
  const salt = randomBytes(16);
  const key = await derive(password, salt, DEFAULT);
  return ['scrypt', DEFAULT.N, DEFAULT.r, DEFAULT.p, salt.toString('base64url'), key.toString('base64url')].join(':');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split(':');
  const N = Number(n), R = Number(r), P = Number(p);
  // Bounds stop a malformed hash from making every login attempt allocate gigabytes.
  const sane = algo === 'scrypt' && Number.isInteger(Math.log2(N)) && N >= 2 ** 14 && N <= 2 ** 20 && R >= 1 && R <= 32 && P >= 1 && P <= 4;
  if (!sane || !salt || !hash || password.length > MAX_PASSWORD_LENGTH) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'), { N, r: R, p: P });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
