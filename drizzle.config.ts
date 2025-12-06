import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// For migration generation, DATABASE_URL is optional
// For push/pull/studio, it's required
const databaseUrl =
  process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
