import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { connectDb } from '@/lib/server/db';
import { assertSameOrigin, clientIp, handle, hashIp, json, readJson } from '@/lib/server/http';
import { Feedback, NamedVisitor } from '@/lib/server/models';
import { DAY, enforce, HOUR } from '@/lib/server/rate-limit';
import { feedbackInput, looksAutomated } from '@/lib/server/validation';

export const runtime = 'nodejs';

/** Private feedback for the owner. Only the admin can read it. */
export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ipHash = hashIp(clientIp(req));
  await enforce(
    [
      { key: `feedback-ip:${ipHash}`, max: 5, windowMs: HOUR },
      { key: 'feedback-global', max: 300, windowMs: DAY },
    ],
    'Too much feedback from here. Please try again later.',
  );
  const input = feedbackInput.parse(await readJson(req, 8 * 1024));
  if (looksAutomated(input, 2000)) {
    await audit('spam_dropped', ipHash, 'feedback');
    return json({ ok: true }, 201);
  }

  await connectDb();
  // The name comes from what the visitor saved earlier, not from this request.
  const named = input.visitorId ? await NamedVisitor.findById(input.visitorId).select({ name: 1 }).lean() : null;
  await Feedback.create({ comment: input.comment, rating: input.rating, name: named?.name, ipHash });
  return json({ ok: true }, 201);
});
