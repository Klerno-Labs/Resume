// Shared utilities for API endpoints - will be inlined by bundler
import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { neon } from '@neondatabase/serverless';

// Lazy database connection - initialized on first use
let _sql: ReturnType<typeof neon> | null = null;

export function getSQL() {
  if (_sql) return _sql;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// Export as const for compatibility
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(target, prop) {
    const db = getSQL();
    return (db as any)[prop];
  },
  apply(target, thisArg, args) {
    const db = getSQL();
    return (db as any)(...args);
  }
}) as ReturnType<typeof neon>;

// User interface
export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  plan: string;
  credits_remaining: number;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

// JWT helpers
export function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
  } catch {
    return null;
  }
}

// Get user from request
export async function getUserFromRequest(req: VercelRequest): Promise<User | null> {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Security: Never use SELECT * - explicitly select columns to avoid exposing password_hash
  const users = await sql`
    SELECT id, email, name, plan, credits_remaining, email_verified, created_at, updated_at
    FROM users
    WHERE id = ${decoded.userId}
  `;
  return (users[0] as User) || null;
}

// Check if user is admin
export function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

// Detect production environment
export function isProductionEnv(req: VercelRequest): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL === '1') return true;
  const host = req.headers.host || '';
  return !host.includes('localhost') && !host.includes('127.0.0.1');
}

// Parse JSON body helper
export async function parseJSONBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];

    // If a parsed body was attached by the runtime, return it directly
    try {
      // @ts-ignore
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      // @ts-ignore
      if (req.body && typeof req.body === 'string') return resolve(JSON.parse(req.body));
    } catch (e) {
      // Ignore and fall back to stream
    }

    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))));

    req.on('end', () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf-8').trim();
        if (!bodyStr) return resolve(null);
        return resolve(JSON.parse(bodyStr));
      } catch (err) {
        console.error('[parseJSONBody] JSON.parse failed:', err instanceof Error ? err.message : String(err));
        return resolve(null);
      }
    });

    req.on('error', () => resolve(null));
  });
}

// Rate limiting - simple in-memory implementation for serverless
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const DEFAULT_RATE_LIMIT = 60; // 60 requests per minute

export function checkRateLimit(
  identifier: string,
  limit: number = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // On-demand cleanup: Remove expired entries (max 10 per check to avoid blocking)
  if (rateLimitStore.size > 50) {
    let cleaned = 0;
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
        if (++cleaned >= 10) break; // Limit cleanup to avoid blocking
      }
    }
  }

  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + RATE_LIMIT_WINDOW;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment counter
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function getRateLimitIdentifier(req: VercelRequest, user?: User | null): string {
  // Use user ID if authenticated, otherwise IP address
  if (user?.id) {
    return `user:${user.id}`;
  }

  // Get IP from various headers (Vercel/Cloudflare)
  const ip =
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  return `ip:${ip}`;
}

// CORS helper
export function setCORS(req: VercelRequest, headers: Record<string, string>) {
  const allowedOrigins = [
    'https://rewriteme.app',
    'http://localhost:5174',
    'http://localhost:3003',
    'http://localhost:5000'
  ];

  // Security: Only allow specific Vercel preview deployments, not wildcards
  const vercelPreviewDomains = process.env.VERCEL_PREVIEW_DOMAINS?.split(',').map(d => d.trim()) || [];
  const allAllowedOrigins = [...allowedOrigins, ...vercelPreviewDomains];

  const origin = req.headers.origin || '';
  const isAllowed = allAllowedOrigins.includes(origin);

  headers['Access-Control-Allow-Credentials'] = 'true';
  headers['Access-Control-Allow-Origin'] = isAllowed ? origin : allowedOrigins[0];
  headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
}
