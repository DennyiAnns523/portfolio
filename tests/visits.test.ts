import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/visit/route';
import { connectDb } from '@/lib/server/db';
import { Visit } from '@/lib/server/models';
import { recordVisit, visitSource, visitStats } from '@/lib/server/visits';
import { freshIp, request } from './support/requests';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

function visit(body: object, { ip = freshIp(), ua = CHROME, origin }: { ip?: string; ua?: string; origin?: string } = {}) {
  const req = request('/api/visit', { body, ip, ...(origin ? { origin } : {}) });
  req.headers.set('user-agent', ua);
  return POST(req);
}

beforeEach(async () => {
  await connectDb();
  await Visit.deleteMany({});
});

describe('visit source', () => {
  it('prefers the ?from= tag, then the referrer', () => {
    expect(visitSource('instagram', 'https://www.linkedin.com/', 'site.example')).toBe('instagram');
    expect(visitSource('Twitter', undefined, 'site.example')).toBe('x');
    expect(visitSource('myspace', undefined, 'site.example')).toBe('other');
    expect(visitSource(undefined, 'https://l.instagram.com/?u=x', 'site.example')).toBe('instagram');
    expect(visitSource(undefined, 'https://lnkd.in/abc', 'site.example')).toBe('linkedin');
    expect(visitSource(undefined, 'https://t.co/xyz', 'site.example')).toBe('x');
    expect(visitSource(undefined, 'https://www.google.co.in/', 'site.example')).toBe('google');
    expect(visitSource(undefined, undefined, 'site.example')).toBe('direct');
    expect(visitSource(undefined, 'https://site.example/admin', 'site.example:443')).toBe('direct');
    expect(visitSource(undefined, 'https://notinstagram.com.evil.example/', 'site.example')).toBe('other');
  });
});

describe('POST /api/visit', () => {
  it('counts one visitor per day however many pages they load, and stores nothing identifying', async () => {
    const ip = '198.51.100.23';
    for (let i = 0; i < 3; i++) expect((await visit({ from: 'instagram' }, { ip })).status).toBe(202);
    const docs = await Visit.find().lean();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ source: 'instagram', views: 3, returning: false });
    expect(JSON.stringify(docs)).not.toContain(ip);
    expect(JSON.stringify(docs)).not.toContain('Chrome');
  });

  it('counts different people separately and records returning visitors', async () => {
    await visit({ from: 'linkedin' });
    await visit({ returning: true });
    const stats = await visitStats(30);
    expect(stats.today).toEqual({ visitors: 2, views: 2 });
    expect(stats.totals.returning).toBe(1);
    expect(stats.sources).toEqual(expect.arrayContaining([{ source: 'linkedin', visitors: 1 }, { source: 'direct', visitors: 1 }]));
  });

  it('marks a visitor as returning when they come back later the same day', async () => {
    const ip = freshIp();
    await visit({ from: 'github' }, { ip });
    await visit({ returning: true }, { ip });
    await visit({ returning: false }, { ip }); // never flips back
    const [doc] = await Visit.find().lean();
    expect(doc).toMatchObject({ source: 'github', returning: true, views: 3 });
  });

  it('ignores bots and link-preview fetchers', async () => {
    await visit({}, { ua: 'facebookexternalhit/1.1' });
    await visit({}, { ua: 'Googlebot/2.1' });
    await visit({}, { ua: '' });
    expect(await Visit.countDocuments()).toBe(0);
  });

  it('rejects cross-site beacons (no inflating your numbers from other sites)', async () => {
    expect((await visit({}, { origin: 'https://evil.example' })).status).toBe(403);
    expect(await Visit.countDocuments()).toBe(0);
  });

  it('uses a different visitor id each day', async () => {
    const input = { ip: '1.2.3.4', userAgent: CHROME, source: 'direct' as const, returning: false };
    await recordVisit(input, new Date('2026-10-01T10:00:00Z'));
    await recordVisit(input, new Date('2026-10-02T10:00:00Z'));
    const [a, b] = await Visit.find().sort({ day: 1 }).lean();
    expect(a.visitorHash).not.toBe(b.visitorHash);
  });

  it('fills a 30-day series with zeros for quiet days', async () => {
    const stats = await visitStats(30);
    expect(stats.days).toHaveLength(30);
    expect(stats.days.every((d) => d.visitors === 0)).toBe(true);
  });
});
