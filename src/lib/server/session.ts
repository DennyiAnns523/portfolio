import { createHash, randomBytes } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { connectDb } from './db';
import { isProduction } from './env';
import { Session } from './models';
import { SESSION_ABSOLUTE_MS, SESSION_COOKIE, SESSION_IDLE_MS } from '../session-cookie';

const TOUCH_EVERY_MS = 5 * 60 * 1000;

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export interface AdminSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
}

/** Creates a server-side session and returns the opaque token for the cookie. */
export async function createSession(meta: { ipHash: string; userAgent?: string }): Promise<string> {
  await connectDb();
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  await Session.create({
    _id: digest(token),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
    ...meta,
  });
  return token;
}

/** Looks up a session by token, enforcing absolute and idle expiry. */
export async function readSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token || token.length > 100) return null;
  await connectDb();
  const id = digest(token);
  const session = await Session.findById(id).lean();
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || session.lastSeenAt.getTime() + SESSION_IDLE_MS <= now) {
    await Session.deleteOne({ _id: id });
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    await Session.updateOne({ _id: id }, { $set: { lastSeenAt: new Date(now) } });
  }
  return { id, createdAt: session.createdAt, expiresAt: session.expiresAt };
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await connectDb();
  await Session.deleteOne({ _id: digest(token) });
}

export async function revokeAllSessions(): Promise<void> {
  await connectDb();
  await Session.deleteMany({});
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_ABSOLUTE_MS / 1000,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: isProduction(), sameSite: 'strict', path: '/', maxAge: 0 });
}
