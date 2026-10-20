import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/contact/route';
import { connectDb } from '@/lib/server/db';
import { ContactMessage } from '@/lib/server/models';
import { freshIp, request } from './support/requests';

const note = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Your world is lovely. Can we talk?', elapsedMs: 9000 };

beforeEach(async () => {
  await connectDb();
  await ContactMessage.deleteMany({});
});

describe('POST /api/contact', () => {
  it('stores a valid note without the raw IP', async () => {
    const res = await POST(request('/api/contact', { body: note, ip: '203.0.113.7' }));
    expect(res.status).toBe(201);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const saved = await ContactMessage.findOne().lean();
    expect(saved).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', status: 'new' });
    expect(saved?.ipHash).toMatch(/^[a-f0-9]{32}$/);
    expect(JSON.stringify(saved)).not.toContain('203.0.113.7');
  });

  it('returns a useful 400 for invalid input', async () => {
    const res = await POST(request('/api/contact', { body: { ...note, email: 'nope' } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it('blocks cross-site submissions', async () => {
    const res = await POST(request('/api/contact', { body: note, origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it('silently drops honeypot and too-fast submissions', async () => {
    const a = await POST(request('/api/contact', { body: { ...note, website: 'http://spam.example' } }));
    const b = await POST(request('/api/contact', { body: { ...note, elapsedMs: 150 } }));
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it('limits each IP to 5 notes an hour', async () => {
    const ip = freshIp();
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(request('/api/contact', { body: note, ip }))).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
    const blocked = await POST(request('/api/contact', { body: note, ip }));
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    // Another visitor is unaffected.
    expect((await POST(request('/api/contact', { body: note }))).status).toBe(201);
  });

  it('rejects oversized bodies before parsing', async () => {
    const res = await POST(request('/api/contact', { rawBody: JSON.stringify({ ...note, message: 'x'.repeat(20_000) }) }));
    expect(res.status).toBe(413);
  });
});
