import type { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/server/auth';
import { connectDb } from '@/lib/server/db';
import { assertSameOrigin, handle, HttpError, json } from '@/lib/server/http';
import { NamedVisitor } from '@/lib/server/models';
import { visitorId } from '@/lib/server/validation';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Removes a named visitor (e.g. an offensive name). Their visits stay counted anonymously. */
export const DELETE = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireAdminApi(req);
  const parsed = visitorId.safeParse((await params).id);
  if (!parsed.success) throw new HttpError(404, 'Not found.');
  await connectDb();
  const { deletedCount } = await NamedVisitor.deleteOne({ _id: parsed.data });
  if (!deletedCount) throw new HttpError(404, 'Not found.');
  return json({ ok: true });
});
