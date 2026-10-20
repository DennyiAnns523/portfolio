import { z } from 'zod';
import { FEEDBACK_STATUSES, IDEA_STATUSES, MESSAGE_STATUSES } from './models';

// Rejects control characters (and Unicode line/paragraph separators). Multi-line text
// has its newlines and tabs checked separately.
const NO_CONTROL_CHARS = /^[^\p{Cc}\u2028\u2029]*$/u;
const stripCarriageReturns = (s: string) => s.replace(/\r\n?/g, '\n');

const singleLine = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`)
    .regex(NO_CONTROL_CHARS, `${label} contains invalid characters`);

// Spam signals sent by the forms: a hidden field humans leave empty, and time spent on the form.
const botSignals = {
  website: z.string().max(200).optional(),
  elapsedMs: z.number().finite().nonnegative().optional(),
};

export const contactInput = z.object({
  name: singleLine(1, 80, 'Name'),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('Email must be a valid address')),
  message: z
    .string()
    .transform(stripCarriageReturns)
    .pipe(
      z
        .string()
        .trim()
        .min(10, 'Message must be at least 10 characters')
        .max(4000, 'Message must be at most 4000 characters')
        .refine((s) => NO_CONTROL_CHARS.test(s.replace(/[\n\t]/g, ' ')), 'Message contains invalid characters'),
    ),
  ...botSignals,
});

export const ideaInput = z.object({
  text: singleLine(1, 100, 'Idea'),
  ...botSignals,
});

// Generated in the visitor's browser with crypto.randomUUID().
export const visitorId = z.uuid();

export const helloInput = z.object({
  visitorId,
  // "@rahul" and "rahul" are both fine; stored without the @ so it can be shown either way.
  name: singleLine(1, 41, 'Name').transform((s) => s.replace(/^@+/, '').trim()).pipe(z.string().min(1, 'Name is required').max(40)),
  source: z.string().max(40).optional(),
});

export const forgetInput = z.object({ visitorId });

export const feedbackInput = z.object({
  comment: z
    .string()
    .transform(stripCarriageReturns)
    .pipe(
      z
        .string()
        .trim()
        .min(3, 'Comment must be at least 3 characters')
        .max(1000, 'Comment must be at most 1000 characters')
        .refine((s) => NO_CONTROL_CHARS.test(s.replace(/[\n\t]/g, ' ')), 'Comment contains invalid characters'),
    ),
  rating: z.number().int().min(1).max(5).optional(),
  visitorId: visitorId.optional(),
  ...botSignals,
});

export const feedbackUpdate = z.object({ status: z.enum(FEEDBACK_STATUSES) });

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(256),
});

export const logoutInput = z.object({ everywhere: z.boolean().optional() }).default({});

export const messageUpdate = z.object({ status: z.enum(MESSAGE_STATUSES) });
export const ideaUpdate = z.object({ status: z.enum(IDEA_STATUSES) });

/** A filled honeypot or an implausibly fast submission. */
export function looksAutomated(input: { website?: string; elapsedMs?: number }, minMs: number): boolean {
  return Boolean(input.website) || (input.elapsedMs !== undefined && input.elapsedMs < minMs);
}
