import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * Create a new resume from form data
 * POST /api/resumes/create
 * Body: { userId, fileName, originalText, improvedText }
 */
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

    // Get user
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { fileName, originalText, improvedText } = req.body;

    if (!fileName || !originalText) {
      return res.status(400).json({ error: 'fileName and originalText are required' });
    }

    const sql = getSQL();
    const resumeId = uuidv4();

    // Insert new resume
    const newResume = await sql`
      INSERT INTO resumes (
        id,
        user_id,
        file_name,
        original_text,
        improved_text,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${resumeId},
        ${user.id},
        ${fileName},
        ${originalText},
        ${improvedText || originalText},
        'completed',
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    console.log('[Create Resume] Successfully created resume:', resumeId);

    // CRITICAL FIX: NEVER return improvedHtml - designs must be explicitly requested
    console.log('[resumes/create] FORCING improvedHtml to NULL');

    return res.json({
      id: newResume[0].id,
      userId: newResume[0].user_id,
      fileName: newResume[0].file_name,
      originalText: newResume[0].original_text,
      improvedText: newResume[0].improved_text,
      improvedHtml: null, // FORCE NULL - designs must be explicitly requested
      atsScore: newResume[0].ats_score,
      keywordsScore: newResume[0].keywords_score,
      formattingScore: newResume[0].formatting_score,
      status: newResume[0].status,
      createdAt: newResume[0].created_at,
      updatedAt: newResume[0].updated_at,
    });
  } catch (error) {
    console.error('[Create Resume] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
