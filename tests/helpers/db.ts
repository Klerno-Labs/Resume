import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { users, resumes, payments, sessions, coverLetters } from '../../shared/schema';

const { Pool } = pkg;

function getConnectionString() {
  // Check if we have component-based env vars (for CI)
  const { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

  if (PGHOST && PGDATABASE && PGUSER) {
    const port = PGPORT || '5432';
    const password = PGPASSWORD || '';
    const connectionString = `postgresql://${PGUSER}:${password}@${PGHOST}:${port}/${PGDATABASE}`;
    console.log(`[Test DB] Built connection string from PG* env vars: postgresql://${PGUSER}:****@${PGHOST}:${port}/${PGDATABASE}`);
    return connectionString;
  }

  return process.env.DATABASE_TEST_URL || process.env.DATABASE_URL;
}

export async function setupTestDb() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error('DATABASE_TEST_URL or DATABASE_URL is required for tests');
  }

  // Log connection string details for debugging
  console.log(`[Test DB] DATABASE_URL length: ${connectionString.length}`);
  console.log(`[Test DB] DATABASE_URL starts with: ${connectionString.substring(0, 15)}...`);
  console.log(`[Test DB] DATABASE_URL full (first 50 chars): ${connectionString.substring(0, 50)}`);

  // Check if URL has proper format
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error(`Invalid DATABASE_URL format. Must start with postgresql:// or postgres://. Got: ${connectionString.substring(0, 30)}...`);
  }

  const pool = new Pool({
    connectionString,
    // CI environment may need time for PostgreSQL to be ready
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });

  // Test connection with retry logic
  let retries = 5;
  let lastError: Error | null = null;
  while (retries > 0) {
    try {
      console.log(`[Test DB] Connection attempt ${6 - retries}/5...`);
      await pool.query('SELECT 1');
      console.log(`[Test DB] Successfully connected!`);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retries--;
      if (retries === 0) {
        await pool.end();
        throw new Error(`Failed to connect to test database after 5 attempts: ${lastError.message}`);
      }
      console.log(`[Test DB] Connection failed, ${retries} retries remaining: ${lastError.message}`);
      // Wait 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const db = drizzle(pool);

  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  if (fs.existsSync(migrationsFolder)) {
    const migrationFiles = fs
      .readdirSync(migrationsFolder)
      .filter((file) => file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.sql'));
    if (migrationFiles.length > 0) {
      try {
        await migrate(db, { migrationsFolder });
      } catch (error) {
        await pool.end();
        throw new Error(`Failed to run migrations: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return { db, pool };
}

export async function teardownTestDb(pool: pkg.Pool | undefined) {
  if (pool) {
    await pool.end();
  }
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
  email: string = `test-${Date.now()}@example.com`
) {
  const passwordHash = await bcrypt.hash('TestPassword123!', 10);
  const [user] = await database
    .insert(users)
    .values({
      email,
      passwordHash,
      name: 'Test User',
      creditsRemaining: 5,
      plan: 'free',
    })
    .returning();

  return user;
}
