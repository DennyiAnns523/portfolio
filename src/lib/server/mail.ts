import nodemailer from 'nodemailer';
import { getEnv } from './env';

/**
 * Best-effort notification that a contact message arrived. The message is already
 * stored, so a mail failure is logged, not surfaced. Visitor text goes only into the
 * plain-text body; the subject and headers contain nothing the visitor controls
 * except a validated Reply-To.
 */
export async function notifyNewMessage(msg: { name: string; email: string; message: string }): Promise<void> {
  const { SMTP_URL, CONTACT_NOTIFY_TO, CONTACT_NOTIFY_FROM } = getEnv();
  if (!SMTP_URL || !CONTACT_NOTIFY_TO) return;
  try {
    const transport = nodemailer.createTransport({
      url: SMTP_URL,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    await transport.sendMail({
      from: CONTACT_NOTIFY_FROM ?? CONTACT_NOTIFY_TO,
      to: CONTACT_NOTIFY_TO,
      replyTo: msg.email,
      subject: 'New note from your portfolio',
      text: `From: ${msg.name} <${msg.email}>\n\n${msg.message}\n\nRead and manage it at /admin/messages`,
    });
  } catch (err) {
    console.error('[mail] notification failed', err instanceof Error ? err.message : err);
  }
}
