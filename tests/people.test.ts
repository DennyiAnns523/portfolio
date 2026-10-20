import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE as deleteFeedback, PATCH as patchFeedback } from '@/app/api/admin/feedback/[id]/route';
import { DELETE as removeVisitor } from '@/app/api/admin/visitors/[id]/route';
import { POST as feedback } from '@/app/api/feedback/route';
import { DELETE as forget, POST as hello } from '@/app/api/hello/route';
import { POST as visit } from '@/app/api/visit/route';
import { connectDb } from '@/lib/server/db';
import { Feedback, NamedVisitor, Visit } from '@/lib/server/models';
import { params, request, signIn } from './support/requests';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const beacon = (body: object) => {
  const req = request('/api/visit', { body });
  req.headers.set('user-agent', CHROME);
  return visit(req);
};

beforeEach(async () => {
  await connectDb();
  await Promise.all([NamedVisitor.deleteMany({}), Feedback.deleteMany({}), Visit.deleteMany({})]);
});

describe('who is visiting', () => {
  it('saves a chosen name (without the @) and updates it on later visits', async () => {
    const id = randomUUID();
    const res = await hello(request('/api/hello', { body: { visitorId: id, name: '@rahul', source: 'instagram' } }));
    expect(res.status).toBe(200);
    expect(await NamedVisitor.findById(id).lean()).toMatchObject({ name: 'rahul', source: 'instagram', visits: 1 });

    expect(await (await beacon({ visitorId: id, newSession: true })).json()).toMatchObject({ named: true });
    await beacon({ visitorId: id, newSession: false }); // a reload is not a new visit
    expect((await NamedVisitor.findById(id).lean())?.visits).toBe(2);
  });

  it('never creates a named record from a plain visit (anonymous stays anonymous)', async () => {
    const res = await beacon({ visitorId: randomUUID(), newSession: true });
    expect(await res.json()).toMatchObject({ named: false });
    expect(await NamedVisitor.countDocuments()).toBe(0);
  });

  it('"forget me" removes the name', async () => {
    const id = randomUUID();
    await hello(request('/api/hello', { body: { visitorId: id, name: 'Asha' } }));
    expect((await forget(request('/api/hello', { method: 'DELETE', body: { visitorId: id } }))).status).toBe(200);
    expect(await NamedVisitor.countDocuments()).toBe(0);
  });

  it('rejects bad names, guessable ids and cross-site requests', async () => {
    const id = randomUUID();
    const bad = [
      { visitorId: id, name: '@@@' },
      { visitorId: id, name: 'x'.repeat(42) },
      { visitorId: id, name: 'line\nbreak' },
      { visitorId: '1', name: 'Asha' },
      { visitorId: { $ne: null }, name: 'Asha' },
    ];
    for (const body of bad) expect((await hello(request('/api/hello', { body }))).status).toBe(400);
    expect((await hello(request('/api/hello', { body: { visitorId: id, name: 'Asha' }, origin: 'https://evil.example' }))).status).toBe(403);
    expect(await NamedVisitor.countDocuments()).toBe(0);
  });
});

describe('feedback', () => {
  const send = (body: object) => feedback(request('/api/feedback', { body: { elapsedMs: 5000, ...body } }));

  it('stores anonymous feedback with an optional rating', async () => {
    expect((await send({ comment: 'Loved the cat!', rating: 5 })).status).toBe(201);
    expect((await send({ comment: 'The garden was slow on my phone.' })).status).toBe(201);
    const items = await Feedback.find().sort({ createdAt: 1 }).lean();
    expect(items.map((f) => [f.comment, f.rating ?? null, f.name ?? null])).toEqual([
      ['Loved the cat!', 5, null],
      ['The garden was slow on my phone.', null, null],
    ]);
  });

  it('attaches the name the visitor saved earlier, and only that (no impersonation via the request)', async () => {
    const id = randomUUID();
    await hello(request('/api/hello', { body: { visitorId: id, name: 'meera' } }));
    await send({ comment: 'Hi from meera', visitorId: id, name: 'Someone Famous' });
    await send({ comment: 'Unknown id', visitorId: randomUUID() });
    const items = await Feedback.find().sort({ createdAt: 1 }).lean();
    expect(items.map((f) => f.name ?? null)).toEqual(['meera', null]);
  });

  it('rejects invalid ratings and empty comments, and drops bots', async () => {
    expect((await send({ comment: 'ok', rating: 3 })).status).toBe(400);
    expect((await send({ comment: 'fine thanks', rating: 6 })).status).toBe(400);
    expect((await send({ comment: 'fine thanks', rating: 2.5 })).status).toBe(400);
    expect((await send({ comment: 'spammy spam', website: 'http://x' })).status).toBe(201);
    expect(await Feedback.countDocuments()).toBe(0);
  });

  it('limits each visitor to 5 an hour', async () => {
    const ip = '192.0.2.77';
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await feedback(request('/api/feedback', { ip, body: { comment: `note ${i}`, elapsedMs: 5000 } }))).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });
});

describe('admin: feedback and named visitors', () => {
  it('requires a session', async () => {
    const f = await Feedback.create({ comment: 'hello there', ipHash: 'h' });
    const id = String(f._id);
    const vid = randomUUID();
    await NamedVisitor.create({ _id: vid, name: 'x', lastSeenAt: new Date() });
    const statuses = await Promise.all([
      patchFeedback(request(`/api/admin/feedback/${id}`, { method: 'PATCH', body: { status: 'read' } }), params(id)),
      deleteFeedback(request(`/api/admin/feedback/${id}`, { method: 'DELETE' }), params(id)),
      removeVisitor(request(`/api/admin/visitors/${vid}`, { method: 'DELETE' }), params(vid)),
    ]);
    expect(statuses.map((r) => r.status)).toEqual([401, 401, 401]);
  });

  it('lets the owner mark feedback read, delete it, and remove a name', async () => {
    const token = await signIn();
    const id = String((await Feedback.create({ comment: 'hello there', ipHash: 'h' }))._id);
    expect((await patchFeedback(request(`/api/admin/feedback/${id}`, { method: 'PATCH', body: { status: 'read' }, cookie: token }), params(id))).status).toBe(200);
    expect((await Feedback.findById(id).lean())?.status).toBe('read');
    expect((await deleteFeedback(request(`/api/admin/feedback/${id}`, { method: 'DELETE', cookie: token }), params(id))).status).toBe(200);

    const vid = randomUUID();
    await NamedVisitor.create({ _id: vid, name: 'rude name', lastSeenAt: new Date() });
    expect((await removeVisitor(request(`/api/admin/visitors/${vid}`, { method: 'DELETE', cookie: token }), params(vid))).status).toBe(200);
    expect(await NamedVisitor.countDocuments()).toBe(0);
    expect((await removeVisitor(request('/api/admin/visitors/x', { method: 'DELETE', cookie: token }), params('not-a-uuid'))).status).toBe(404);
  });
});
