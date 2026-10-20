import type { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/server/auth';
import { connectDb } from '@/lib/server/db';
import { assertObjectId, assertSameOrigin, handle, HttpError, json, readJson } from '@/lib/server/http';
import { Feedback } from '@/lib/server/models';
import { feedbackUpdate } from '@/lib/server/validation';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireAdminApi(req);
  const id = assertObjectId((await params).id);
  const { status } = feedbackUpdate.parse(await readJson(req, 1024));
  await connectDb();
  const updated = await Feedback.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
  if (!updated) throw new HttpError(404, 'Not found.');
  return json({ ok: true, status: updated.status });
});

export const DELETE = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireAdminApi(req);
  const id = assertObjectId((await params).id);
  await connectDb();
  const { deletedCount } = await Feedback.deleteOne({ _id: id });
  if (!deletedCount) throw new HttpError(404, 'Not found.');
  return json({ ok: true });
});
