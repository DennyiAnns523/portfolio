import type { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/server/auth';
import { connectDb } from '@/lib/server/db';
import { assertObjectId, assertSameOrigin, handle, HttpError, json, readJson } from '@/lib/server/http';
import { Idea } from '@/lib/server/models';
import { ideaUpdate } from '@/lib/server/validation';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireAdminApi(req);
  const id = assertObjectId((await params).id);
  const { status } = ideaUpdate.parse(await readJson(req, 1024));
  await connectDb();
  const update =
    status === 'pending' ? { $set: { status }, $unset: { reviewedAt: 1 } } : { $set: { status, reviewedAt: new Date() } };
  const updated = await Idea.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!updated) throw new HttpError(404, 'Not found.');
  return json({ ok: true, status: updated.status });
});

export const DELETE = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireAdminApi(req);
  const id = assertObjectId((await params).id);
  await connectDb();
  const { deletedCount } = await Idea.deleteOne({ _id: id });
  if (!deletedCount) throw new HttpError(404, 'Not found.');
  return json({ ok: true });
});
