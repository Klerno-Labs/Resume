import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../lib/env";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool);
