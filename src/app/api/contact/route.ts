import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { connectDb } from '@/lib/server/db';
import { assertSameOrigin, clientIp, handle, hashIp, json, readJson, userAgent } from '@/lib/server/http';
import { notifyNewMessage } from '@/lib/server/mail';
import { ContactMessage } from '@/lib/server/models';
import { DAY, enforce, HOUR } from '@/lib/server/rate-limit';
import { contactInput, looksAutomated } from '@/lib/server/validation';

export const runtime = 'nodejs';

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ipHash = hashIp(clientIp(req));
  await enforce(
    [
      { key: `contact-ip:${ipHash}`, max: 5, windowMs: HOUR },
      { key: 'contact-global', max: 200, windowMs: DAY },
    ],
    'Too many messages from here. Please try again later.',
  );

  const input = contactInput.parse(await readJson(req));
  if (looksAutomated(input, 3000)) {
    // Look like success so bots get no signal, but store nothing.
    await audit('spam_dropped', ipHash, 'contact');
    return json({ ok: true }, 201);
  }

  await connectDb();
  await ContactMessage.create({
    name: input.name,
    email: input.email,
    message: input.message,
    ipHash,
    userAgent: userAgent(req),
  });
  await notifyNewMessage(input);
  return json({ ok: true }, 201);
});
