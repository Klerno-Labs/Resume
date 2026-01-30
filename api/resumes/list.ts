import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest } from '../_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    const headers: Record<string, string> = {};
    const { setCORS } = await import('../_shared');
    setCORS(req, headers);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

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
