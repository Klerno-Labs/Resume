import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest, setupCORSAndHandleOptions } from '../_shared.js';

/**
 * Save selected design to resume
 * POST /api/resumes/save-design
 * Body: { resumeId: string, html: string, templateName: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    if (setupCORSAndHandleOptions(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get user
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { resumeId, html, templateName } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    console.log('[Save Design] Saving design for resume:', resumeId, 'Template:', templateName || 'Unknown');

    // Verify resume belongs to user
    const resumes = await sql`
      SELECT id, user_id
      FROM resumes
      WHERE id = ${resumeId} AND user_id = ${user.id}
    ` as any[];

    if (!resumes || resumes.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Save the design to database
    console.log('[Save Design] Updating database for resume:', resumeId);
    console.log('[Save Design] HTML length:', html.length, 'characters');

    await sql`
      UPDATE resumes SET
        improved_html = ${html},
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;

    // VERIFICATION: Read back the saved design to ensure it persisted
    console.log('[Save Design] Verifying save by reading back from database...');
    const verification = await sql`
      SELECT improved_html
      FROM resumes
      WHERE id = ${resumeId}
    ` as any[];

    if (!verification || verification.length === 0) {
      console.error('[Save Design] CRITICAL: Verification failed - resume not found after save!');
      throw new Error('Failed to verify design save');
    }

    const savedHtml = verification[0].improved_html;
    if (!savedHtml || savedHtml.length === 0) {
      console.error('[Save Design] CRITICAL: improved_html is NULL or empty after save!');
      console.error('[Save Design] Expected length:', html.length, 'Got:', savedHtml?.length || 0);
      throw new Error('Design save verification failed - HTML not persisted');
    }

    if (savedHtml.length !== html.length) {
      console.warn('[Save Design] WARNING: Saved HTML length mismatch!');
      console.warn('[Save Design] Expected:', html.length, 'Got:', savedHtml.length);
    } else {
      console.log('[Save Design] ✓ Verification successful - design persisted correctly');
    }

    console.log('[Save Design] Design saved and verified for resume:', resumeId);

    return res.json({
      success: true,
      message: 'Design saved successfully',
      verified: true,
      htmlLength: savedHtml.length,
    });
  } catch (error) {
    console.error('[Save Design] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
