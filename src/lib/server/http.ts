import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getEnv } from './env';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** Wraps a route handler: known errors become JSON responses, anything else a generic 500. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status, err.headers);
      if (err instanceof z.ZodError) {
        const first = err.issues[0];
        const field = first?.path.join('.');
        return json({ error: field ? `${field}: ${first.message}` : 'Invalid request.' }, 400);
      }
      console.error('[api] unhandled error', err);
      return json({ error: 'Something went wrong. Please try again later.' }, 500);
    }
  };
}

/**
 * Client IP for rate limiting and pseudonymous logging. On Vercel (and most managed
 * proxies) these headers are set by the platform and cannot be forged by the client.
 * If you self-host without a proxy, put one in front, or per-IP limits can be evaded;
 * the global limits still apply.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0];
  return ip?.trim() || 'unknown';
}

/** Keyed hash of the IP, so stored data can't be reversed into addresses without the secret. */
export function hashIp(ip: string): string {
  return createHmac('sha256', getEnv().IP_HASH_SECRET).update(ip).digest('hex').slice(0, 32);
}

export function userAgent(req: Request): string | undefined {
  return req.headers.get('user-agent')?.slice(0, 300) || undefined;
}

/**
 * CSRF defence for state-changing requests: the browser-set Origin header must match
 * our own origin. Browsers always send Origin on cross-site POST/PATCH/DELETE, so a
 * forged form or fetch from another site is rejected. Combined with SameSite=Strict
 * cookies and JSON-only bodies, this closes the classic CSRF paths.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) {
    if (req.headers.get('sec-fetch-site') === 'same-origin') return;
    throw new HttpError(403, 'Cross-site request blocked.');
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Cross-site request blocked.');
  }
  const configured = getEnv().APP_ORIGIN;
  const expected = configured
    ? new URL(configured).host
    : (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host);
  if (originHost !== expected) throw new HttpError(403, 'Cross-site request blocked.');
}

/** Reads a JSON body with a hard size cap, without buffering more than the cap. */
export async function readJson(req: Request, maxBytes = 16 * 1024): Promise<unknown> {
  const type = req.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(type)) throw new HttpError(415, 'Expected application/json.');
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, 'Request too large.');
  if (!req.body) throw new HttpError(400, 'Missing request body.');

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, 'Request too large.');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Malformed JSON.');
  }
}

const OBJECT_ID = /^[a-f0-9]{24}$/;
export function assertObjectId(id: string): string {
  if (!OBJECT_ID.test(id)) throw new HttpError(404, 'Not found.');
  return id;
}
