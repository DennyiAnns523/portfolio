import { describe, expect, it } from 'vitest';
import { assertSameOrigin, HttpError, readJson } from '@/lib/server/http';
import { hashPassword, verifyPassword } from '@/lib/server/password';
import { hit } from '@/lib/server/rate-limit';
import { contactInput, ideaInput } from '@/lib/server/validation';
import { ORIGIN, request } from './support/requests';

const status = (fn: () => unknown) => {
  try {
    fn();
    return 'passed';
  } catch (e) {
    return e instanceof HttpError ? e.status : e;
  }
};

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const hash = await hashPassword('a long enough secret');
    expect(hash).toMatch(/^scrypt:32768:8:1:[\w-]+:[\w-]+$/);
    expect(hash).not.toContain('$'); // dotenv would try to expand it
    expect(await verifyPassword('a long enough secret', hash)).toBe(true);
    expect(await verifyPassword('a long enough secreT', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same password twice')).not.toBe(await hashPassword('same password twice'));
  });

  it('refuses short passwords and malformed or abusive hashes', async () => {
    await expect(hashPassword('short')).rejects.toThrow();
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    // An absurd cost factor must be refused rather than allocating gigabytes.
    expect(await verifyPassword('x', 'scrypt:1073741824:8:1:AAAA:AAAA')).toBe(false);
  });
});

describe('same-origin check', () => {
  it('accepts our own origin', () => {
    expect(status(() => assertSameOrigin(request('/x')))).toBe('passed');
  });

  it('rejects another origin, a missing origin, and a lookalike host', () => {
    expect(status(() => assertSameOrigin(request('/x', { origin: 'https://evil.example' })))).toBe(403);
    expect(status(() => assertSameOrigin(request('/x', { origin: null })))).toBe(403);
    expect(status(() => assertSameOrigin(request('/x', { origin: 'http://localhost:3000.evil.example' })))).toBe(403);
    expect(status(() => assertSameOrigin(request('/x', { origin: 'null' })))).toBe(403);
  });

  it('accepts a same-origin fetch that omitted Origin', () => {
    const req = request('/x', { origin: null });
    req.headers.set('sec-fetch-site', 'same-origin');
    expect(status(() => assertSameOrigin(req))).toBe('passed');
  });

  it('pins to APP_ORIGIN when configured', async () => {
    const { getEnv } = await import('@/lib/server/env');
    const env = getEnv();
    env.APP_ORIGIN = 'https://dennyi.example';
    try {
      expect(status(() => assertSameOrigin(request('/x', { origin: ORIGIN })))).toBe(403);
      expect(status(() => assertSameOrigin(request('/x', { origin: 'https://dennyi.example' })))).toBe('passed');
    } finally {
      delete env.APP_ORIGIN;
    }
  });
});

describe('JSON body reader', () => {
  it('rejects non-JSON content types (blocks simple cross-site form posts)', async () => {
    await expect(readJson(request('/x', { contentType: 'text/plain', rawBody: '{}' }))).rejects.toMatchObject({ status: 415 });
    await expect(readJson(request('/x', { contentType: 'application/x-www-form-urlencoded', rawBody: 'a=b' }))).rejects.toMatchObject({ status: 415 });
  });

  it('rejects oversized and malformed bodies', async () => {
    await expect(readJson(request('/x', { rawBody: JSON.stringify({ a: 'x'.repeat(5000) }) }), 1024)).rejects.toMatchObject({ status: 413 });
    await expect(readJson(request('/x', { rawBody: '{"a":' }))).rejects.toMatchObject({ status: 400 });
  });
});

describe('input validation', () => {
  const valid = { name: 'Ada', email: 'ADA@Example.com ', message: 'Hello there, lovely world.' };

  it('normalises a valid message', () => {
    const parsed = contactInput.parse({ ...valid, message: 'line one\r\nline two is here' });
    expect(parsed.email).toBe('ada@example.com');
    expect(parsed.message).toBe('line one\nline two is here');
  });

  it('rejects header-injection and control characters', () => {
    expect(contactInput.safeParse({ ...valid, name: 'Ada\r\nBcc: victim@example.com' }).success).toBe(false);
    expect(contactInput.safeParse({ ...valid, message: 'hello \u0000 world, sneaky' }).success).toBe(false);
    expect(ideaInput.safeParse({ text: 'what if we split lines' }).success).toBe(false);
  });

  it('rejects invalid emails and out-of-range lengths', () => {
    expect(contactInput.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    expect(contactInput.safeParse({ ...valid, message: 'too short' }).success).toBe(false);
    expect(contactInput.safeParse({ ...valid, message: 'x'.repeat(4001) }).success).toBe(false);
    expect(ideaInput.safeParse({ text: 'x'.repeat(101) }).success).toBe(false);
    expect(ideaInput.safeParse({ text: '   ' }).success).toBe(false);
  });

  it('rejects operator objects where strings are expected (NoSQL injection)', () => {
    expect(contactInput.safeParse({ ...valid, email: { $gt: '' } }).success).toBe(false);
    expect(ideaInput.safeParse({ text: { $ne: null } }).success).toBe(false);
  });
});

describe('rate limiter', () => {
  it('allows up to the limit within a window, then blocks, then resets', async () => {
    const limit = { key: `unit-${Math.random()}`, max: 3, windowMs: 60_000 };
    const t0 = 1_000_000_000_000;
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await hit(limit, t0)).ok);
    expect(results).toEqual([true, true, true, false]);
    expect((await hit(limit, t0 + 60_000)).ok).toBe(true);
  });

  it('counts correctly under concurrent first hits', async () => {
    const limit = { key: `race-${Math.random()}`, max: 5, windowMs: 60_000 };
    const results = await Promise.all(Array.from({ length: 10 }, () => hit(limit)));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
  });
});
