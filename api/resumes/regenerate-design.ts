import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import { getRandomTemplate } from '../lib/designTemplates.js';
import { validateResumeContrast } from '../lib/contrastValidator.js';

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

// Lazy OpenAI client
let _openai: OpenAI | null = null;

function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
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

// Tier-based regeneration limits
const REGENERATION_LIMITS: Record<string, number> = {
  free: 3,
  premium: 5,
  pro: 10,
  admin: Infinity, // Unlimited for admin
};

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

    // Get resume ID from request body
    const { resumeId } = req.body as { resumeId?: string };
    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    console.log('[Regenerate Design] User:', user.id, 'Resume:', resumeId);

    const sql = getSQL();

    // Get resume
    const resumes = await sql`SELECT * FROM resumes WHERE id = ${resumeId} AND user_id = ${user.id}`;
    const resume = resumes[0] as any;

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Check regeneration limit
    const limit = REGENERATION_LIMITS[user.plan as string] || REGENERATION_LIMITS.free;
    const currentUsage = resume.design_regenerations_used || 0;

    if (currentUsage >= limit) {
      return res.status(403).json({
        error: 'Regeneration limit reached',
        message: `You have reached your ${limit} design regeneration limit. Upgrade to get more regenerations.`,
        limit,
        used: currentUsage,
      });
    }

    console.log('[Regenerate Design] Current usage:', currentUsage, 'Limit:', limit);

    // Generate new design with random template (now async!)
    const template = await getRandomTemplate();
    const openai = getOpenAI();

    console.log('[Regenerate Design] Using template:', template.name);

    const designResult = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional resume designer. Create SIMPLE, MINIMAL resumes.

ABSOLUTELY NO:
- NO colored backgrounds or blocks
- NO sidebars with background colors
- NO decorative elements
- NO icons or graphics
- NO boxes with colored backgrounds

COLORS ALLOWED:
1. Page background: ONLY white (#FFFFFF)
2. ALL text: ONLY black (#000000) or dark gray (#2d2d2d)
3. Accent color ${template.accentColor}: ONLY for the name text and 1px underlines under section headers
4. That's it. Nothing else.

STRUCTURE:
- Single column layout (NO sidebars, NO colored left/right sections)
- Standard margins: 0.75 inch all sides
- Font: ${template.fonts[0]} at 10-11pt body, 12pt headers, 18pt name
- Two pages stacked vertically
- Total height: auto (content flows naturally)

CONTENT REQUIREMENTS:
- Page 1: Name, contact, summary, start of experience
- Page 2: Rest of experience, education, skills, certifications
- Include EVERY section from the resume
- DO NOT truncate or cut off content

OUTPUT: {"html": "<!DOCTYPE html>..."}`,
        },
        {
          role: 'user',
          content: `Create a MINIMAL single-column resume (NO sidebars, NO colored blocks) with this content:

${resume.improved_text || resume.original_text}

CRITICAL:
- White background ONLY - no colored sections
- Black text ONLY
- ${template.accentColor} ONLY for name and section underlines
- Single column (NOT two-column layout)
- Include ALL sections: experience, education, skills, certifications, etc.
- Two pages stacked vertically

Return JSON: {"html": "<!DOCTYPE html>..."}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 8000,
    });

    let design;
    try {
      const content = designResult.choices[0].message.content || '{}';
      design = JSON.parse(content);
    } catch (parseError) {
      console.error('[Regenerate] JSON parse error:', parseError);
      console.error('[Regenerate] Raw content:', designResult.choices[0].message.content?.substring(0, 500));
      return res.status(500).json({ error: 'AI generated invalid JSON format' });
    }

    if (!design.html) {
      return res.status(500).json({ error: 'Failed to generate design' });
    }

    // Validate contrast ratios (WCAG AA compliance)
    console.log('[Regenerate Design] Validating contrast ratios...');
    const contrastValidation = validateResumeContrast(design.html);

    if (!contrastValidation.passed) {
      console.warn('[Regenerate Design] Contrast validation failed:', contrastValidation.summary);
      console.warn('[Regenerate Design] Failed checks:', contrastValidation.results.filter(r => !r.meetsAA));

      // Log which colors failed
      const failedChecks = contrastValidation.results.filter(r => !r.meetsAA);
      failedChecks.forEach(check => {
        console.warn(`  - ${check.context}: ${check.contrastRatio.toFixed(2)}:1 (needs 4.5:1)`);
      });

      // For now, we'll accept the design but log the warning
      // In the future, we could regenerate automatically
      console.warn('[Regenerate Design] Design has poor contrast but proceeding anyway');
    } else {
      console.log('[Regenerate Design] ✓ Contrast validation passed!', contrastValidation.summary);
    }

    // Update resume with new design and increment counter
    await sql`
      UPDATE resumes SET
        improved_html = ${design.html},
        design_regenerations_used = ${currentUsage + 1},
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;

    console.log('[Regenerate Design] Success! New design generated:', template.name);

    return res.json({
      success: true,
      improvedHtml: design.html,
      templateName: template.name,
      style: template.style,
      regenerationsUsed: currentUsage + 1,
      regenerationsLimit: limit,
      regenerationsRemaining: limit === Infinity ? Infinity : limit - (currentUsage + 1),
      contrastValidation: {
        passed: contrastValidation.passed,
        ...contrastValidation.summary,
      },
    });
  } catch (error) {
    console.error('[Regenerate Design] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
