import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { neon } from '@neondatabase/serverless';
import { enqueueJob } from '../lib/queue';

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

// Helper to get user from request
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

    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const body = await parseJSONBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    const { key, filename } = body;
    if (!key || !filename) {
      return res.status(400).json({ error: 'key and filename required' });
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      return res.status(500).json({ error: 'S3_BUCKET not configured' });
    }

    const sql = getSQL();

    // Create resume placeholder in DB with queued status
    const result = await sql`
      INSERT INTO resumes (user_id, file_name, original_text, status, original_file_name)
      VALUES (${user.id}, ${filename}, ${''}, 'queued', ${filename})
      RETURNING *
    `;
    const resume = result[0] as any;

    // Enqueue background job for worker to fetch object and process
    await enqueueJob({ resumeId: resume.id, bucket, key, filename, userId: user.id });

    return res.json({ resumeId: resume.id, status: 'queued' });
  } catch (err: unknown) {
    console.error('[uploads/complete] Error:', err);
    return res.status(500).json({
      error: 'Failed to complete upload',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
