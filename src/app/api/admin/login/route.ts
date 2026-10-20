import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { getEnv } from '@/lib/server/env';
import { assertSameOrigin, clientIp, handle, hashIp, HttpError, json, readJson, userAgent } from '@/lib/server/http';
import { verifyPassword } from '@/lib/server/password';
import { hit, HOUR, MINUTE } from '@/lib/server/rate-limit';
import { createSession, setSessionCookie } from '@/lib/server/session';
import { loginInput } from '@/lib/server/validation';

export const runtime = 'nodejs';

const sha = (s: string) => createHash('sha256').update(s).digest();

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ipHash = hashIp(clientIp(req));

  // Per-IP limit stops one client guessing; the global limit stops a distributed guess
  // at the cost of locking the owner out for at most an hour during an attack.
  for (const limit of [
    { key: `login-ip:${ipHash}`, max: 5, windowMs: 15 * MINUTE },
    { key: 'login-global', max: 30, windowMs: HOUR },
  ]) {
    const result = await hit(limit);
    if (!result.ok) {
      await audit('login_rate_limited', ipHash, limit.key.startsWith('login-ip') ? 'ip' : 'global');
      throw new HttpError(429, 'Too many sign-in attempts. Please wait and try again.', {
        'Retry-After': String(result.retryAfterSec),
      });
    }
  }

  const { email, password } = loginInput.parse(await readJson(req, 2 * 1024));
  const env = getEnv();
  // Always run the password check so a wrong email takes as long as a wrong password.
  const emailOk = timingSafeEqual(sha(email), sha(env.ADMIN_EMAIL));
  const passwordOk = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!emailOk || !passwordOk) {
    await audit('login_failed', ipHash);
    throw new HttpError(401, 'Invalid email or password.');
  }

  const token = await createSession({ ipHash, userAgent: userAgent(req) });
  await audit('login_success', ipHash);
  const res = json({ ok: true });
  setSessionCookie(res, token);
  return res;
});
