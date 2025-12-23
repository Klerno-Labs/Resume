import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

export function getSQL() {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in environment for DB connections');
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// Legacy export for backwards compatibility - lazy initialization
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(target, prop) {
    const db = getSQL();
    return (db as any)[prop];
  }
});

export default sql;
