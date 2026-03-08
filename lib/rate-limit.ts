import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ── Upstash Redis rate limiter (persistent across cold starts) ──────────
// Falls back to in-memory when UPSTASH_REDIS_REST_URL is not configured.

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function getUpstashLimiter(maxRequests: number, windowMs: number): Ratelimit {
  const key = `${maxRequests}:${windowMs}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
      prefix: 'rl',
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

// ── In-memory fallback ──────────────────────────────────────────────────
const memMap = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = memMap.get(key);

  if (!entry || now > entry.resetAt) {
    memMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memMap) {
      if (now > entry.resetAt) memMap.delete(key);
    }
  }, 300_000);
}

// ── Public API (unchanged signature) ────────────────────────────────────
export async function rateLimit(
  key: string,
  maxRequests = 60,
  windowMs = 60_000
): Promise<{ allowed: boolean; remaining: number }> {
  if (redis) {
    try {
      const limiter = getUpstashLimiter(maxRequests, windowMs);
      const result = await limiter.limit(key);
      return { allowed: result.success, remaining: result.remaining };
    } catch {
      // Redis unreachable — fall through to in-memory
    }
  }
  return memoryRateLimit(key, maxRequests, windowMs);
}
