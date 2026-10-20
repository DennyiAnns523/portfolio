import type { NextRequest } from 'next/server';
import { connectDb } from '@/lib/server/db';
import { assertSameOrigin, clientIp, handle, hashIp, json, readJson } from '@/lib/server/http';
import { NamedVisitor } from '@/lib/server/models';
import { DAY, enforce, HOUR } from '@/lib/server/rate-limit';
import { forgetInput, helloInput } from '@/lib/server/validation';
import { visitSource } from '@/lib/server/visits';

export const runtime = 'nodejs';

/** A visitor chooses to say who they are (or changes their name). */
export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  await enforce(
    [
      { key: `hello-ip:${hashIp(clientIp(req))}`, max: 10, windowMs: HOUR },
      { key: 'hello-global', max: 1000, windowMs: DAY },
    ],
    'Too many tries. Please try again later.',
  );
  const { visitorId, name, source } = helloInput.parse(await readJson(req, 2 * 1024));
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
  await connectDb();
  const now = new Date();
  await NamedVisitor.updateOne(
    { _id: visitorId },
    { $set: { name, lastSeenAt: now }, $setOnInsert: { source: visitSource(source, undefined, host), visits: 1 } },
    { upsert: true },
  );
  return json({ ok: true, name });
});

/** "Forget me": removes the name; the visitor is anonymous again. */
export const DELETE = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const { visitorId } = forgetInput.parse(await readJson(req, 1024));
  await connectDb();
  await NamedVisitor.deleteOne({ _id: visitorId });
  return json({ ok: true });
});
