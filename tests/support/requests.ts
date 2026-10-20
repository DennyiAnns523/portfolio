import { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

export const ORIGIN = 'http://localhost:3000';
export const ADMIN = { email: 'owner@example.com', password: 'correct horse battery staple' };

let ipCounter = 0;
/** A fresh client IP, so per-IP rate limits don't leak between tests. */
export const freshIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

interface Opts {
  method?: string;
  body?: unknown;
  rawBody?: string;
  ip?: string;
  origin?: string | null;
  cookie?: string;
  contentType?: string;
}

export function request(path: string, { method = 'POST', body, rawBody, ip = freshIp(), origin = ORIGIN, cookie, contentType = 'application/json' }: Opts = {}) {
  const headers = new Headers({ 'x-real-ip': ip, host: 'localhost:3000' });
  if (origin) headers.set('origin', origin);
  if (cookie) headers.set('cookie', `${SESSION_COOKIE}=${cookie}`);
  const hasBody = method !== 'GET';
  if (hasBody) headers.set('content-type', contentType);
  return new NextRequest(`${ORIGIN}${path}`, {
    method,
    headers,
    body: hasBody ? (rawBody ?? JSON.stringify(body ?? {})) : undefined,
  });
}

export const params = (id: string) => ({ params: Promise.resolve({ id }) });

/** Signs in through the real login route and returns the session token from Set-Cookie. */
export async function signIn(): Promise<string> {
  const { POST } = await import('@/app/api/admin/login/route');
  const res = await POST(request('/api/admin/login', { body: ADMIN }));
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  const token = res.headers.get('set-cookie')?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (!token) throw new Error('no session cookie');
  return token;
}
