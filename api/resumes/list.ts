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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    const origin = req.headers.origin || '';
    const allowedOrigins = ['https://rewriteme.app', 'http://localhost:5174'];
    const isAllowed = allowedOrigins.includes(origin) || origin.includes('vercel.app');

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[resumes/list] Fetching resumes for user:', user.id);

    const sql = getSQL();

    // Fetch all resumes for this user, ordered by most recent first
    const resumes = await sql`
      SELECT
        id,
        file_name,
        ats_score,
        keywords_score,
        formatting_score,
        status,
        created_at,
        updated_at,
        improved_html IS NOT NULL as has_design
      FROM resumes
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    console.log('[resumes/list] Found', resumes.length, 'resumes');

    return res.json({
      resumes: resumes.map((resume: any) => ({
        id: resume.id,
        fileName: resume.file_name,
        atsScore: resume.ats_score,
        keywordsScore: resume.keywords_score,
        formattingScore: resume.formatting_score,
        status: resume.status,
        hasDesign: resume.has_design,
        createdAt: resume.created_at,
        updatedAt: resume.updated_at,
      })),
    });
  } catch (error) {
    console.error('[resumes/list] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
