import { connectDb } from './db';
import { RateLimit } from './models';
import { HttpError } from './http';

export interface Limit {
  /** Bucket name, e.g. `contact-ip:<hash>` or `login-global`. */
  key: string;
  max: number;
  windowMs: number;
}

/**
 * Fixed-window counter stored in MongoDB, so limits hold across serverless instances.
 * Expired windows are removed by the TTL index on `expiresAt`.
 */
export async function hit({ key, max, windowMs }: Limit, now = Date.now()) {
  await connectDb();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const id = `${key}:${windowStart}`;
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs) } };
  let doc;
  try {
    doc = await RateLimit.findOneAndUpdate({ _id: id }, update, { upsert: true, new: true }).lean();
  } catch (err) {
    // Two concurrent first hits can both try to insert; the loser retries as an update.
    if ((err as { code?: number }).code !== 11000) throw err;
    doc = await RateLimit.findOneAndUpdate({ _id: id }, update, { new: true }).lean();
  }
  const count = doc?.count ?? max + 1;
  return { ok: count <= max, retryAfterSec: Math.ceil((windowStart + windowMs - now) / 1000) };
}

/** Applies every limit; throws 429 with Retry-After if any is exhausted. */
export async function enforce(limits: Limit[], message = 'Too many requests. Please try again later.') {
  for (const limit of limits) {
    const result = await hit(limit);
    if (!result.ok) throw new HttpError(429, message, { 'Retry-After': String(result.retryAfterSec) });
  }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
