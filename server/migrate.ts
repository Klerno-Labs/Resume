import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import "dotenv/config";

/**
 * Database Migration Script
 *
 * This script runs all pending Drizzle migrations against the database.
 * Run with: npm run db:migrate
 */

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set. Please configure your database connection.");
    process.exit(1);
  }

  console.log("🔄 Starting database migration...");
  console.log(`📦 Database: ${process.env.DATABASE_URL.split("@")[1] || "configured"}`);

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const db = drizzle(client);

    console.log("📂 Running migrations from ./migrations folder...");

    await migrate(db, { migrationsFolder: "./migrations" });

    console.log("✅ Database migration completed successfully!");
    console.log("🎉 All tables and schema are up to date.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("🔌 Database connection closed.");
  }
}

runMigrations();
