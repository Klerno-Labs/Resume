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

    // Extract resume ID from URL path
    console.log('[resumes/[id]] Raw URL:', req.url);
    console.log('[resumes/[id]] Query:', req.query);

    // Try query param first (Vercel dynamic routes use query.id)
    const resumeId = (req.query?.id as string) || req.url?.split('/').pop();
    if (!resumeId) {
      console.log('[resumes/[id]] No resume ID found in query or URL');
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    console.log('[resumes/[id]] Fetching resume:', resumeId);

    const sql = getSQL();
    const resumes = await sql`SELECT * FROM resumes WHERE id = ${resumeId}`;
    const resume = resumes[0] as any;

    if (!resume) {
      console.log('[resumes/[id]] Resume not found in database:', resumeId);
      return res.status(404).json({ error: 'Resume not found' });
    }

    console.log('[resumes/[id]] Resume found:', resumeId, 'status:', resume.status);

    // Get user to check if they can access improved text
    const user = await getUserFromRequest(req);
    // Free users can only see assessment (scores/issues), not the improved text
    // Paid users (basic/pro/premium/admin) can see everything
    const canAccessImprovedText = user && user.plan !== 'free';

    // CRITICAL FIX: NEVER return improvedHtml in the main resume fetch
    // Design should ONLY be returned when user explicitly requests it via regenerate-design or preview-designs
    // This prevents automatic design appearance even with old cached frontend code
    console.log('[resumes/[id]] FORCING improvedHtml to NULL - designs must be explicitly requested');

    return res.json({
      id: resume.id,
      userId: resume.user_id,
      fileName: resume.file_name,
      originalText: resume.original_text,
      improvedText: canAccessImprovedText ? resume.improved_text : null,
      improvedHtml: null, // FORCE NULL - designs must be explicitly requested
      atsScore: resume.ats_score,
      keywordsScore: resume.keywords_score,
      formattingScore: resume.formatting_score,
      issues: resume.issues,
      status: resume.status,
      createdAt: resume.created_at,
      updatedAt: resume.updated_at,
      requiresUpgrade: !canAccessImprovedText && resume.status === 'completed',
    });
  } catch (error) {
    console.error('[resumes/[id]] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
