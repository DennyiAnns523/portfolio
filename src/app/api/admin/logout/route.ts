import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { requireAdminApi } from '@/lib/server/auth';
import { assertSameOrigin, clientIp, handle, hashIp, json, readJson } from '@/lib/server/http';
import { clearSessionCookie, revokeAllSessions, revokeSession } from '@/lib/server/session';
import { SESSION_COOKIE } from '@/lib/session-cookie';
import { logoutInput } from '@/lib/server/validation';

export const runtime = 'nodejs';

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const { everywhere } = logoutInput.parse(await readJson(req, 1024));
  const ipHash = hashIp(clientIp(req));
  if (everywhere) {
    // Signing everyone out needs a live session; a plain sign-out works even if it expired.
    await requireAdminApi(req);
    await revokeAllSessions();
    await audit('logout_all', ipHash);
  } else {
    await revokeSession(req.cookies.get(SESSION_COOKIE)?.value);
    await audit('logout', ipHash);
  }
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
});
