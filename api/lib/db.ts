import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in environment for DB connections');
}

export const sql = neon(process.env.DATABASE_URL);

export default sql;
