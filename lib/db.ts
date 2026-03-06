import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const sql: NeonQueryFunction<false, false> = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// Lazy proxy so imports don't fail at build time
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop: string | symbol) {
    const instance = getDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});
