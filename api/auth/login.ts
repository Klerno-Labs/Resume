import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
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

// Helper to detect production environment
function isProductionEnv(req: VercelRequest): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL === '1') return true;
  const host = req.headers.host || '';
  return !host.includes('localhost') && !host.includes('127.0.0.1');
}

// Helper to generate JWT
function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

// Helper to parse JSON body
async function parseJSONBody(req: VercelRequest): Promise<any> {
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

    const { email, password } = body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const sql = getSQL();
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    const user = users[0] as any;

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ userId: user.id, email: user.email });
    res.setHeader(
      'Set-Cookie',
      serialize('token', token, {
        httpOnly: true,
        secure: isProductionEnv(req),
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
    );

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        creditsRemaining: user.credits_remaining,
      },
    });
  } catch (error) {
    console.error('[auth/login] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
