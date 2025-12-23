import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { neon } from '@neondatabase/serverless';

// Lazy database connection
let _sql: ReturnType<typeof neon> | null = null;

function getSQL() {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// Helper to verify JWT
function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
  } catch {
    return null;
  }
}

// Helper to get user from request (optional for analytics)
async function getUserFromRequest(req: VercelRequest): Promise<any | null> {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const sql = getSQL();
  const users = await sql`SELECT * FROM users WHERE id = ${decoded.userId}`;
  return users[0] || null;
}

// Helper to parse JSON body
async function parseJSONBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];

    try {
      // @ts-ignore
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      // @ts-ignore
      if (req.body && typeof req.body === 'string') return resolve(JSON.parse(req.body));
    } catch (e) {
      // Ignore
    }

    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))));

    req.on('end', () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf-8').trim();
        if (!bodyStr) return resolve(null);
        return resolve(JSON.parse(bodyStr));
      } catch (err) {
        return resolve(null);
      }
    });

    req.on('error', () => resolve(null));
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    const origin = req.headers.origin || '';
    const allowedOrigins = ['https://rewriteme.app', 'http://localhost:5174'];
    const isAllowed = allowedOrigins.includes(origin) || origin.includes('vercel.app');

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = await parseJSONBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    const { event, properties, page, referrer, sessionId } = body;

    if (!event || !sessionId) {
      return res.status(400).json({ error: 'Event name and sessionId required' });
    }

    // Get user if authenticated (optional for analytics)
    const user = await getUserFromRequest(req);
    const userId = user?.id || null;

    const userAgent = req.headers['user-agent'] || null;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || null;

    const sql = getSQL();

    // Store analytics event (gracefully handle if table doesn't exist yet)
    try {
      await sql`
        INSERT INTO analytics_events (user_id, session_id, event, properties, page, referrer, user_agent, ip_address)
        VALUES (${userId}, ${sessionId}, ${event}, ${JSON.stringify(properties || {})}, ${page || null}, ${referrer || null}, ${userAgent}, ${ipAddress})
      `;
    } catch (err) {
      // Silently ignore if analytics table doesn't exist - don't break the app
      console.warn('[analytics/event] Failed (table may not exist):', err);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[analytics/event] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
