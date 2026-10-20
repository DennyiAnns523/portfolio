import { beforeEach, describe, expect, it } from 'vitest';
import { PATCH } from '@/app/api/admin/ideas/[id]/route';
import { GET, POST } from '@/app/api/ideas/route';
import { connectDb } from '@/lib/server/db';
import { Idea } from '@/lib/server/models';
import { params, request, signIn } from './support/requests';

beforeEach(async () => {
  await connectDb();
  await Idea.deleteMany({});
});

const plant = (text: string) => POST(request('/api/ideas', { body: { text, elapsedMs: 4000 } }));

describe('idea garden', () => {
  it('keeps new ideas private until approved', async () => {
    expect((await plant('What if clouds kept diaries?')).status).toBe(201);
    let body = await (await GET()).json();
    expect(body.ideas).toEqual([]);

    const idea = await Idea.findOne().lean();
    expect(idea?.status).toBe('pending');
    const token = await signIn();
    const res = await PATCH(request(`/api/admin/ideas/${idea!._id}`, { method: 'PATCH', body: { status: 'approved' }, cookie: token }), params(String(idea!._id)));
    expect(res.status).toBe(200);

    body = await (await GET()).json();
    expect(body.ideas).toEqual([{ id: String(idea!._id), text: 'What if clouds kept diaries?' }]);
  });

  it('never exposes who planted an idea', async () => {
    await plant('What if bees had maps?');
    await Idea.updateMany({}, { status: 'approved' });
    const raw = JSON.stringify(await (await GET()).json());
    expect(raw).not.toMatch(/ipHash|createdAt|status/);
  });

  it('rejects ideas that are empty, too long, or cross-site', async () => {
    expect((await plant('   ')).status).toBe(400);
    expect((await plant('x'.repeat(101))).status).toBe(400);
    const cross = await POST(request('/api/ideas', { body: { text: 'hi there' }, origin: 'https://evil.example' }));
    expect(cross.status).toBe(403);
    expect(await Idea.countDocuments()).toBe(0);
  });

  it('stops accepting ideas when the review queue is full', async () => {
    await Idea.insertMany(Array.from({ length: 500 }, (_, i) => ({ text: `seed ${i}`, ipHash: 'x' })));
    expect((await plant('one too many')).status).toBe(503);
  });
});
