import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

redis.on("connect", () => {
  console.log("Redis connected");
});

// ATS Score Caching
export async function cacheAtsScore(resumeId: string, score: unknown): Promise<void> {
  const key = `ats:${resumeId}`;
  await redis.setex(key, 3600, JSON.stringify(score)); // 1 hour TTL
}

export async function getCachedAtsScore(resumeId: string): Promise<unknown> {
  const key = `ats:${resumeId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function invalidateAtsScore(resumeId: string): Promise<void> {
  const key = `ats:${resumeId}`;
  await redis.del(key);
}

// User Data Caching
export async function cacheUserData(userId: string, data: unknown): Promise<void> {
  const key = `user:${userId}`;
  await redis.setex(key, 1800, JSON.stringify(data)); // 30 min TTL
}

export async function getCachedUserData(userId: string): Promise<unknown> {
  const key = `user:${userId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

// Rate Limiting (already handled by express-rate-limit with Redis store)
export async function incrementRateLimit(key: string, windowMs: number): Promise<number> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.pexpire(key, windowMs);
  }
  return current;
}
