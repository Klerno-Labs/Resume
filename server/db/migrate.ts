import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../lib/env";

async function runMigration() {
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  if (!fs.existsSync(migrationsFolder)) {
    console.log("No migrations folder found. Skipping migration.");
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsFolder)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".sql"));

  if (migrationFiles.length === 0) {
    console.log("No migrations to run.");
    return;
  }

  const sql = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete!");

  await sql.end();
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
