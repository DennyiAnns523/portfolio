import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { connectDb } from '@/lib/server/db';
import { assertSameOrigin, clientIp, handle, hashIp, HttpError, json, readJson } from '@/lib/server/http';
import { Idea } from '@/lib/server/models';
import { DAY, enforce, HOUR } from '@/lib/server/rate-limit';
import { ideaInput, looksAutomated } from '@/lib/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stops a flood of submissions from filling the database faster than they can be reviewed.
const MAX_PENDING = 500;

/** Approved ideas only; nothing about who planted them. */
export const GET = handle(async () => {
  await connectDb();
  const ideas = await Idea.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(24).select({ text: 1 }).lean();
  return json(
    { ideas: ideas.map((i) => ({ id: String(i._id), text: i.text })) },
    200,
    { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
  );
});

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ipHash = hashIp(clientIp(req));
  await enforce(
    [
      { key: `idea-ip:${ipHash}`, max: 10, windowMs: HOUR },
      { key: 'idea-global', max: 500, windowMs: DAY },
    ],
    'Too many ideas from here. Please try again later.',
  );

  const input = ideaInput.parse(await readJson(req, 4 * 1024));
  if (looksAutomated(input, 800)) {
    await audit('spam_dropped', ipHash, 'idea');
    return json({ ok: true }, 201);
  }

  await connectDb();
  if ((await Idea.countDocuments({ status: 'pending' })) >= MAX_PENDING) {
    throw new HttpError(503, 'The idea garden is full right now. Please try again later.');
  }
  await Idea.create({ text: input.text, ipHash });
  return json({ ok: true }, 201);
});
