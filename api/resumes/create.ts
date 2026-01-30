import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest } from '../_shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new resume from form data
 * POST /api/resumes/create
 * Body: { userId, fileName, originalText, improvedText }
 */
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
