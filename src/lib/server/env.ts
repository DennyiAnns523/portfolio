import { z } from 'zod';

/**
 * Server-only configuration, validated once on first use (not at import time,
 * so `next build` works without secrets). Never import this from client code.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// URI'),
  ADMIN_EMAIL: z.email().transform((v) => v.trim().toLowerCase()),
  // Produced by `npm run hash-password`. Colon-separated so dotenv never tries to expand it.
  ADMIN_PASSWORD_HASH: z.string().regex(/^scrypt:\d+:\d+:\d+:[\w-]+:[\w-]+$/, 'run `npm run hash-password` to generate it'),
  // Keys the HMAC used to pseudonymise visitor IPs before they are stored.
  IP_HASH_SECRET: z.string().min(32, 'use at least 32 random characters'),
  // Optional: the public origin (e.g. https://example.com). When set, state-changing
  // requests must come from exactly this origin; otherwise the request's own host is used.
  APP_ORIGIN: z.url().optional(),
  // Optional e-mail notification for new contact messages.
  SMTP_URL: z.string().regex(/^smtps?:\/\//).optional(),
  CONTACT_NOTIFY_TO: z.email().optional(),
  CONTACT_NOTIFY_FROM: z.email().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  // Treat empty strings in .env files as "not set".
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server environment:\n${problems}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => process.env.NODE_ENV === 'production';
