import mongoose from 'mongoose';
import { getEnv } from './env';

mongoose.set('strictQuery', true);

// Reuse one connection across hot reloads in dev and across invocations of a warm serverless function.
const globalCache = globalThis as unknown as {
  __mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};
const cache = (globalCache.__mongoose ??= { conn: null, promise: null });

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(getEnv().MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDb(): Promise<void> {
  if (cache.conn) await cache.conn.disconnect();
  cache.conn = null;
  cache.promise = null;
}
