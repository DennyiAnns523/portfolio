import mongoose from 'mongoose';
import { connectDb } from '@/lib/server/db';
import { json } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness plus a database ping. Deliberately reveals nothing about configuration. */
export async function GET() {
  try {
    await connectDb();
    await mongoose.connection.db?.command({ ping: 1 });
    return json({ ok: true, db: 'up' });
  } catch {
    return json({ ok: false, db: 'down' }, 503);
  }
}
