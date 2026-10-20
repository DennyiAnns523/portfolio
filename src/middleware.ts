import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from './lib/session-cookie';

/**
 * Runs for Next-rendered pages (the admin area and error pages). The world at `/` is a
 * static file with its own CSP from next.config.ts.
 *
 * 1. A per-request nonce CSP, so only scripts Next itself emits can run.
 * 2. A quick redirect to the login page when there's no session cookie at all. This is a
 *    convenience only: pages and API routes verify the session against the database.
 */
export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== 'production';
  const https = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${dev ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  const { pathname } = req.nextUrl;
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  if (isAdmin && pathname !== '/admin/login' && !req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  if (isAdmin) {
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

export const config = {
  // Everything except `/` (the static world), API routes, Next internals and files with an extension.
  matcher: ['/((?!api/|_next/|.*\\..*).+)'],
};
