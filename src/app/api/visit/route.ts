import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin, clientIp, handle, hashIp, json, readJson } from '@/lib/server/http';
import { NamedVisitor } from '@/lib/server/models';
import { enforce, HOUR } from '@/lib/server/rate-limit';
import { visitorId } from '@/lib/server/validation';
import { isBot, recordVisit, visitSource } from '@/lib/server/visits';

export const runtime = 'nodejs';

const visitInput = z.object({
  from: z.string().max(40).optional(),
  referrer: z.string().max(2048).optional(),
  returning: z.boolean().optional(),
  // Only sent by visitors who chose to say who they are.
  visitorId: visitorId.optional(),
  newSession: z.boolean().optional(),
});

/** Anonymous page-view beacon sent by the world page. */
export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ua = req.headers.get('user-agent') ?? undefined;
  const input = visitInput.parse(await readJson(req, 4 * 1024));
  if (isBot(ua)) return json({ ok: true }, 202);

  const ip = clientIp(req);
  await enforce([{ key: `visit-ip:${hashIp(ip)}`, max: 120, windowMs: HOUR }]);
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
  await recordVisit({
    ip,
    userAgent: ua!,
    source: visitSource(input.from, input.referrer, host),
    returning: input.returning ?? false,
  });

  if (!input.visitorId) return json({ ok: true }, 202);
  const update = { $set: { lastSeenAt: new Date() }, ...(input.newSession ? { $inc: { visits: 1 } } : {}) };
  const { matchedCount } = await NamedVisitor.updateOne({ _id: input.visitorId }, update);
  // `named: false` tells the browser its name was removed, so it stops greeting by name.
  return json({ ok: true, named: matchedCount > 0 }, 202);
});
