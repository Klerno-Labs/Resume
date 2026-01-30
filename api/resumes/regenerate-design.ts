import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest, checkRateLimit, getRateLimitIdentifier, setCORS } from '../_shared';
import OpenAI from 'openai';
import { getRandomTemplate } from '../lib/designTemplates';
import { validateResumeContrast } from '../lib/contrastValidator';

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
    const headers: Record<string, string> = {};
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

    // Rate limiting: 5-15 regenerations per minute (expensive AI operation)
    const rateLimit = user.plan === 'free' ? 3 : user.plan === 'premium' ? 15 : 10;
    const rateLimitCheck = checkRateLimit(getRateLimitIdentifier(req, user), rateLimit);

    res.setHeader('X-RateLimit-Limit', rateLimit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitCheck.resetAt).toISOString());

    if (!rateLimitCheck.allowed) {
      console.log(`[regenerate-design] Rate limit exceeded for user ${user.id}`);
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Design regeneration limit reached. Please wait before trying again.',
        retryAfter: Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000),
      });
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

    // Get resume
    const resumes = await sql`
      SELECT id, user_id, file_name, original_text, improved_text, improved_html,
             ats_score, keywords_score, formatting_score, status, design_regenerations_used,
             created_at, updated_at
      FROM resumes
      WHERE id = ${resumeId} AND user_id = ${user.id}
    `;
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
          content: `You are a premium resume designer. Create a visually impressive HTML resume.

TEMPLATE: ${template.name}
- Layout: ${template.layout}${template.sidebar !== 'none' ? ` with ${template.sidebar} sidebar (35% width, gradient: ${template.gradient}, white text)` : ''}
- Accent Color: ${template.accentColor}
- Fonts: ${template.fonts[0]} (headers), ${template.fonts[1]} (body)
${template.gradient !== 'none' ? `- Background Gradient: ${template.gradient}` : ''}

DESIGN ELEMENTS:
- Use gradient backgrounds and colored sections
- Add visual skill bars with progress indicators
- Include contact icons (✉ ☎ 📍)
- Use the accent color for headers and highlights
- Add subtle shadows and professional spacing
- Make it visually striking and premium

RULES:
- Return ONLY valid JSON: {"html": "<!DOCTYPE html><html>...</html>"}
- Include ALL resume content
- Height: auto (not fixed)
- Make it look expensive and professional`,
        },
        {
          role: 'user',
          content: `Create a premium HTML resume using the ${template.name} template.

CONTENT:
${resume.improved_text || resume.original_text}

Apply gradient ${template.gradient} and accent color ${template.accentColor}.
Return ONLY JSON: {"html": "<!DOCTYPE html>..."}`,
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
