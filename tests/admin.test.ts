import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE as deleteIdea, PATCH as patchIdea } from '@/app/api/admin/ideas/[id]/route';
import { POST as login } from '@/app/api/admin/login/route';
import { POST as logout } from '@/app/api/admin/logout/route';
import { DELETE as deleteMessage, PATCH as patchMessage } from '@/app/api/admin/messages/[id]/route';
import { connectDb } from '@/lib/server/db';
import { AuditEvent, ContactMessage, Idea, RateLimit, Session } from '@/lib/server/models';
import { readSession } from '@/lib/server/session';
import { SESSION_COOKIE } from '@/lib/session-cookie';
import { ADMIN, freshIp, params, request, signIn } from './support/requests';

beforeEach(async () => {
  await connectDb();
  await Promise.all([Session.deleteMany({}), ContactMessage.deleteMany({}), Idea.deleteMany({}), AuditEvent.deleteMany({})]);
  // The global login limit is shared by every test in this file.
  await RateLimit.deleteMany({ _id: /^login-global/ });
});

const seedMessage = async () =>
  String((await ContactMessage.create({ name: 'A', email: 'a@example.com', message: 'hello hello', ipHash: 'h' }))._id);

describe('admin sign-in', () => {
  it('sets a hardened session cookie on success and stores only a hash of the token', async () => {
    const res = await login(request('/api/admin/login', { body: ADMIN }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\//);

    const token = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))![1];
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 random bytes
    const stored = await Session.find().lean();
    expect(stored).toHaveLength(1);
    expect(stored[0]._id).not.toBe(token);
    expect(await AuditEvent.countDocuments({ type: 'login_success' })).toBe(1);
  });

  it('gives the same answer for a wrong email and a wrong password', async () => {
    const a = await login(request('/api/admin/login', { body: { ...ADMIN, password: 'wrong password!!' } }));
    const b = await login(request('/api/admin/login', { body: { ...ADMIN, email: 'someone@example.com' } }));
    expect([a.status, b.status]).toEqual([401, 401]);
    expect(await a.json()).toEqual(await b.json());
    expect(a.headers.get('set-cookie')).toBeNull();
    expect(await AuditEvent.countDocuments({ type: 'login_failed' })).toBe(2);
  });

  it('accepts the email case-insensitively', async () => {
    const res = await login(request('/api/admin/login', { body: { ...ADMIN, email: 'Owner@Example.COM' } }));
    expect(res.status).toBe(200);
  });

  it('locks out an IP after 5 attempts, even with the right password', async () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) {
      await login(request('/api/admin/login', { ip, body: { ...ADMIN, password: `guess number ${i}` } }));
    }
    const res = await login(request('/api/admin/login', { ip, body: ADMIN }));
    expect(res.status).toBe(429);
    expect(await AuditEvent.countDocuments({ type: 'login_rate_limited' })).toBe(1);
  });

  it('caps sign-in attempts globally against distributed guessing', async () => {
    for (let i = 0; i < 30; i++) await login(request('/api/admin/login', { body: { ...ADMIN, password: 'nope nope nope' } }));
    expect((await login(request('/api/admin/login', { body: ADMIN }))).status).toBe(429);
  });

  it('refuses cross-site sign-in (login CSRF)', async () => {
    expect((await login(request('/api/admin/login', { body: ADMIN, origin: 'https://evil.example' }))).status).toBe(403);
  });
});

describe('admin API authorisation', () => {
  it('rejects every admin action without a valid session', async () => {
    const id = await seedMessage();
    const calls = [
      patchMessage(request(`/api/admin/messages/${id}`, { method: 'PATCH', body: { status: 'read' } }), params(id)),
      deleteMessage(request(`/api/admin/messages/${id}`, { method: 'DELETE' }), params(id)),
      patchIdea(request(`/api/admin/ideas/${id}`, { method: 'PATCH', body: { status: 'approved' }, cookie: 'forged-token' }), params(id)),
      deleteIdea(request(`/api/admin/ideas/${id}`, { method: 'DELETE', cookie: 'x'.repeat(500) }), params(id)),
    ];
    expect((await Promise.all(calls)).map((r) => r.status)).toEqual([401, 401, 401, 401]);
    expect(await ContactMessage.countDocuments({ status: 'new' })).toBe(1);
  });

  it('rejects a valid session used from another site', async () => {
    const token = await signIn();
    const id = await seedMessage();
    const res = await deleteMessage(request(`/api/admin/messages/${id}`, { method: 'DELETE', cookie: token, origin: 'https://evil.example' }), params(id));
    expect(res.status).toBe(403);
    expect(await ContactMessage.countDocuments()).toBe(1);
  });

  it('lets the signed-in owner manage messages', async () => {
    const token = await signIn();
    const id = await seedMessage();
    const patch = await patchMessage(request(`/api/admin/messages/${id}`, { method: 'PATCH', body: { status: 'archived' }, cookie: token }), params(id));
    expect(patch.status).toBe(200);
    expect((await ContactMessage.findById(id).lean())?.status).toBe('archived');

    const bad = await patchMessage(request(`/api/admin/messages/${id}`, { method: 'PATCH', body: { status: 'deleted' }, cookie: token }), params(id));
    expect(bad.status).toBe(400);

    const del = await deleteMessage(request(`/api/admin/messages/${id}`, { method: 'DELETE', cookie: token }), params(id));
    expect(del.status).toBe(200);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it('returns 404 for malformed and unknown ids', async () => {
    const token = await signIn();
    const malformed = await deleteMessage(request('/api/admin/messages/abc', { method: 'DELETE', cookie: token }), params('{"$ne":null}'));
    const unknown = await deleteMessage(request('/api/admin/messages/x', { method: 'DELETE', cookie: token }), params('0123456789abcdef01234567'));
    expect([malformed.status, unknown.status]).toEqual([404, 404]);
  });
});

describe('sessions', () => {
  it('expire after the idle timeout', async () => {
    const token = await signIn();
    expect(await readSession(token)).not.toBeNull();
    await Session.updateMany({}, { lastSeenAt: new Date(Date.now() - 3 * 60 * 60 * 1000) });
    expect(await readSession(token)).toBeNull();
    expect(await Session.countDocuments()).toBe(0);
  });

  it('expire at the absolute limit even when active', async () => {
    const token = await signIn();
    await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    expect(await readSession(token)).toBeNull();
  });

  it('sign-out revokes the session server-side and clears the cookie', async () => {
    const token = await signIn();
    const res = await logout(request('/api/admin/logout', { cookie: token, body: {} }));
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
    expect(await readSession(token)).toBeNull();
  });

  it('"sign out everywhere" revokes every session but needs a live one', async () => {
    const a = await signIn();
    const b = await signIn();
    expect((await logout(request('/api/admin/logout', { body: { everywhere: true }, cookie: 'stale' }))).status).toBe(401);
    expect(await Session.countDocuments()).toBe(2);
    expect((await logout(request('/api/admin/logout', { body: { everywhere: true }, cookie: a }))).status).toBe(200);
    expect(await readSession(a)).toBeNull();
    expect(await readSession(b)).toBeNull();
  });
});
