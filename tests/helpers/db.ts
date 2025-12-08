import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import {
  users,
  resumes,
  payments,
  sessions,
  coverLetters,
} from "../../shared/schema";

const { Pool } = pkg;

function getConnectionString() {
  return process.env.DATABASE_TEST_URL || process.env.DATABASE_URL;
}

export async function setupTestDb() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error("DATABASE_TEST_URL or DATABASE_URL is required for tests");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  if (fs.existsSync(migrationsFolder)) {
    const migrationFiles = fs
      .readdirSync(migrationsFolder)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".sql"));
    if (migrationFiles.length > 0) {
      await migrate(db, { migrationsFolder });
    }
  }

  return { db, pool };
}

export async function teardownTestDb(pool: pkg.Pool) {
  await pool.end();
}

export async function clearDb(db: any) {
  await db.delete(payments);
  await db.delete(coverLetters);
  await db.delete(resumes);
  await db.delete(sessions);
  await db.delete(users);
}

export async function createTestUser(
  database: any,
  email: string = `test-${Date.now()}@example.com`,
) {
  const passwordHash = await bcrypt.hash("TestPassword123!", 10);
  const [user] = await database
    .insert(users)
    .values({
      email,
      passwordHash,
      name: "Test User",
      creditsRemaining: 5,
      plan: "free",
    })
    .returning();

  return user;
}
