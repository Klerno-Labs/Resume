import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../storage";
import { redis } from "../lib/cache";

const router = Router();

router.get("/health", async (_req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: "healthy",
    checks: {
      database: "unknown",
      redis: "unknown",
      memory: "unknown",
    },
  };

  try {
    await db.execute(sql`SELECT 1`);
    checks.checks.database = "connected";
  } catch (error) {
    checks.checks.database = "disconnected";
    checks.status = "unhealthy";
  }

  try {
    await redis.ping();
    checks.checks.redis = "connected";
  } catch (error) {
    checks.checks.redis = "disconnected";
    checks.status = "degraded";
  }

  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  checks.checks.memory = `${memPercent.toFixed(2)}%`;

  if (memPercent > 90) {
    checks.status = "degraded";
  }

  const statusCode =
    checks.status === "healthy" ? 200 : checks.status === "degraded" ? 200 : 503;

  res.status(statusCode).json(checks);
});

router.get("/health/ready", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    await redis.ping();
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

router.get("/health/live", (_req, res) => {
  res.status(200).json({ alive: true });
});

export default router;
