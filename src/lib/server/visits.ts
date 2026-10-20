import { createHmac } from 'node:crypto';
import { connectDb } from './db';
import { getEnv } from './env';
import { Visit, VISIT_SOURCES, type VisitSource } from './models';

const REFERRER_SOURCES: [RegExp, VisitSource][] = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, 'x'],
  [/(^|\.)github\.com$/, 'github'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)whatsapp\.(com|net)$/, 'whatsapp'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
];

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp\/|telegrambot|discordbot|curl|wget|python|node-fetch|axios/i;

export const isBot = (userAgent: string | undefined) => !userAgent || BOTS.test(userAgent);

/**
 * Where a visit came from. An explicit `?from=` tag on your profile links wins, because
 * social apps' in-app browsers often send no referrer at all.
 */
export function visitSource(from: string | undefined, referrer: string | undefined, ownHost: string): VisitSource {
  const tag = from?.trim().toLowerCase();
  if (tag) {
    if (tag === 'twitter') return 'x';
    return (VISIT_SOURCES as readonly string[]).includes(tag) ? (tag as VisitSource) : 'other';
  }
  if (!referrer) return 'direct';
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'other';
  }
  if (host === ownHost.split(':')[0]) return 'direct';
  return REFERRER_SOURCES.find(([pattern]) => pattern.test(host))?.[1] ?? 'other';
}

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

/** Counts a page view. Repeat views by the same visitor on the same day only bump `views`. */
export async function recordVisit(input: { ip: string; userAgent: string; source: VisitSource; returning: boolean }, now = new Date()) {
  await connectDb();
  const day = utcDay(now);
  // Day-salted, so the same person gets an unrelated hash tomorrow.
  const visitorHash = createHmac('sha256', getEnv().IP_HASH_SECRET).update(`${day}|${input.ip}|${input.userAgent}`).digest('hex').slice(0, 32);
  const update = {
    $inc: { views: 1 },
    // $max: once a visitor comes back (even later the same day), they stay counted as returning.
    $max: { returning: input.returning },
    $setOnInsert: { source: input.source, firstAt: now },
  };
  try {
    await Visit.updateOne({ day, visitorHash }, update, { upsert: true });
  } catch (err) {
    // A visitor's first two views landing at once: the second becomes a plain update.
    if ((err as { code?: number }).code !== 11000) throw err;
    await Visit.updateOne({ day, visitorHash }, update);
  }
}

export interface VisitStats {
  days: { day: string; visitors: number; views: number; returning: number }[];
  sources: { source: VisitSource; visitors: number }[];
  totals: { visitors: number; views: number; returning: number };
  today: { visitors: number; views: number };
}

export async function visitStats(dayCount = 30, now = new Date()): Promise<VisitStats> {
  await connectDb();
  const days: string[] = [];
  for (let i = dayCount - 1; i >= 0; i--) days.push(utcDay(new Date(now.getTime() - i * 86_400_000)));
  const match = { $match: { day: { $gte: days[0] } } };

  const [byDay, bySource] = await Promise.all([
    Visit.aggregate<{ _id: string; visitors: number; views: number; returning: number }>([
      match,
      { $group: { _id: '$day', visitors: { $sum: 1 }, views: { $sum: '$views' }, returning: { $sum: { $cond: ['$returning', 1, 0] } } } },
    ]),
    Visit.aggregate<{ _id: VisitSource; visitors: number }>([
      match,
      { $group: { _id: '$source', visitors: { $sum: 1 } } },
      { $sort: { visitors: -1 } },
    ]),
  ]);

  const map = new Map(byDay.map((d) => [d._id, d]));
  const series = days.map((day) => ({
    day,
    visitors: map.get(day)?.visitors ?? 0,
    views: map.get(day)?.views ?? 0,
    returning: map.get(day)?.returning ?? 0,
  }));
  const sum = (k: 'visitors' | 'views' | 'returning') => series.reduce((n, d) => n + d[k], 0);
  const last = series[series.length - 1];
  return {
    days: series,
    sources: bySource.map((s) => ({ source: s._id, visitors: s.visitors })),
    totals: { visitors: sum('visitors'), views: sum('views'), returning: sum('returning') },
    today: { visitors: last.visitors, views: last.views },
  };
}
