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

    // PREMIUM-ONLY FEATURE: Only premium+ users can regenerate designs
    if (!['premium', 'pro', 'admin'].includes(user.plan)) {
      console.log('[Regenerate Design] Non-premium user attempted access:', user.id, 'plan:', user.plan);
      return res.status(403).json({
        error: 'Premium feature',
        message: 'Design regeneration is only available for Premium, Pro, and Admin users. Upgrade your plan to access this feature.',
        requiresUpgrade: true,
        requiredPlan: 'premium',
      });
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
          content: `You are an ELITE resume designer creating PREMIUM, VISUALLY STUNNING resumes for executives.

TEMPLATE: "${template.name}" - ${template.style} style, ${template.layout} layout

DESIGN SPECIFICATIONS:
${template.sidebar !== 'none' ? `
SIDEBAR DESIGN:
- ${template.sidebar === 'left' ? 'Left' : 'Right'} sidebar: 35% width with gradient background: ${template.gradient}
- Sidebar text: WHITE (#FFFFFF) on gradient background
- Sidebar contains: Contact info, Skills with visual bars, Education
- Main content: 65% width, white background, contains Experience
` : template.layout === 'header-banner' ? `
HEADER BANNER:
- Full-width banner with gradient: ${template.gradient}
- Banner height: 180px, contains Name (32pt white) and Title/Contact
- Below banner: Two columns - left 60% (Experience), right 40% (Skills, Education)
` : template.layout === '2-column' ? `
TWO-COLUMN LAYOUT:
- Left column 50%, right column 50%
- Section headers with gradient underline using: ${template.gradient}
- Alternating content placement for visual interest
` : `
SINGLE-COLUMN PREMIUM:
- Full-width header with subtle background tint
- Section dividers with accent color
- Clean spacing with premium typography
`}

COLORS & STYLING:
- Accent color: ${template.accentColor} (use for headers, borders, highlights)
- Primary font: ${template.fonts[0]} for headers (16-24pt)
- Body font: ${template.fonts[1]} for content (10-11pt)
${template.gradient !== 'none' ? `- Gradient: ${template.gradient} (use generously for visual impact)` : ''}
- Add subtle shadows, borders, and spacing for depth
- Use icons for contact info (email, phone, location symbols)

PREMIUM ELEMENTS:
✨ Visual skill bars with percentages
✨ Timeline dots and lines for experience
✨ Section icons and decorative headers
✨ Gradient backgrounds and colored sections
✨ Professional spacing and whitespace
✨ Modern card-style sections with subtle shadows

CRITICAL:
- Make it VISUALLY STUNNING - this is a PREMIUM paid feature
- Apply the template's gradient and colors BOLDLY
- Include ALL content sections from the resume
- Page height: auto-fit content (no fixed height)

OUTPUT: {"html": "<!DOCTYPE html>..."}`,
        },
        {
          role: 'user',
          content: `Create a PREMIUM, VISUALLY STUNNING "${template.name}" resume with this content:

${resume.improved_text || resume.original_text}

APPLY THE TEMPLATE DESIGN:
- Use gradient background: ${template.gradient}
- Use accent color ${template.accentColor} prominently
- Use fonts: ${template.fonts.join(', ')}
- Layout: ${template.layout}${template.sidebar !== 'none' ? ` with ${template.sidebar} sidebar` : ''}

Make it look EXPENSIVE and PROFESSIONAL - this is a premium paid feature!

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
