import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '../session-cookie';
import { HttpError } from './http';
import { readSession, type AdminSession } from './session';

/**
 * Every admin route handler and page checks the session itself against the database.
 * The middleware's cookie check is only a fast redirect, never the security boundary.
 */
export async function requireAdminApi(req: NextRequest): Promise<AdminSession> {
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) throw new HttpError(401, 'Not signed in.');
  return session;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value);
}

export async function requireAdminPage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}
