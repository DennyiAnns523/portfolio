import { randomBytes } from 'node:crypto';
import { afterAll, inject } from 'vitest';

// Environment must be in place before any server module calls getEnv().
const base = inject('mongoUri').replace(/\/?(\?.*)?$/, '');
const query = inject('mongoUri').match(/\?.*$/)?.[0] ?? '';
process.env.MONGODB_URI = `${base}/pf_test_${randomBytes(4).toString('hex')}${query}`;
process.env.ADMIN_EMAIL = 'owner@example.com';
// 'correct horse battery staple', hashed by scripts/hash-password.mjs, so the tests also
// prove the CLI and the server agree on the format.
process.env.ADMIN_PASSWORD_HASH =
  'scrypt:32768:8:1:PXB0OBq360k20OEo1gPp6g:_89HLREH5nuJd1jyeFXHRBzyBIZmTJhXg_iXmYKun767cG_Xfroo0vuhRtZbbYejroooSUtAfjrXYyROi8eL5w';
process.env.IP_HASH_SECRET = 'test-secret-test-secret-test-secret-123';

afterAll(async () => {
  const { disconnectDb } = await import('@/lib/server/db');
  const mongoose = (await import('mongoose')).default;
  await mongoose.connection.db?.dropDatabase().catch(() => {});
  await disconnectDb();
});
