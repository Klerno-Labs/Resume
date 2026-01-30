import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest, checkRateLimit, getRateLimitIdentifier, setCORS } from '../_shared.js';
import OpenAI from 'openai';
import { getAllTemplates } from '../lib/designTemplates.js';
import { validateResumeContrast } from '../lib/contrastValidator.js';

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

/**
 * Generate 3 design previews for user to choose from
 * POST /api/resumes/preview-designs
 */
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

    // Rate limiting: 5 design previews per minute (expensive AI operation)
    const rateLimit = user.plan === 'free' ? 3 : 10;
    const rateLimitCheck = checkRateLimit(getRateLimitIdentifier(req, user), rateLimit);

    res.setHeader('X-RateLimit-Limit', rateLimit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitCheck.resetAt).toISOString());

    if (!rateLimitCheck.allowed) {
      console.log(`[preview-designs] Rate limit exceeded for user ${user.id}`);
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Design preview limit reached. Please wait before requesting more.',
        retryAfter: Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000),
      });
    }

    // PREMIUM-ONLY FEATURE: Only premium+ users can access design previews
    if (!['premium', 'pro', 'admin'].includes(user.plan)) {
      console.log('[Preview Designs] Non-premium user attempted access:', user.id, 'plan:', user.plan);
      return res.status(403).json({
        error: 'Premium feature',
        message: 'Design previews are only available for Premium, Pro, and Admin users. Upgrade your plan to access this feature.',
        requiresUpgrade: true,
        requiredPlan: 'premium',
      });
    }

    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    // Get resume
    const resumes = await sql`
      SELECT id, user_id, file_name, original_text, improved_text, improved_html,
             ats_score, keywords_score, formatting_score, status, created_at, updated_at
      FROM resumes
      WHERE id = ${resumeId} AND user_id = ${user.id}
    ` as any[];

    if (!resumes || resumes.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = resumes[0];

    console.log('[Preview Designs] Generating 3 design options for resume:', resumeId);

    // Get all templates and select 3 COMPLETELY RANDOM ones each time
    const allTemplates = await getAllTemplates();

    // SUPER RANDOM SELECTION - Fisher-Yates shuffle algorithm for true randomness
    const shuffled = [...allTemplates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take the first 3 from the shuffled array (completely random every time)
    const selectedTemplates = shuffled.slice(0, 3);

    console.log('[Preview Designs] RANDOMLY selected templates:', selectedTemplates.map(t => `${t.name} (${t.layout})`));

    const openai = getOpenAI();
    const previews = [];

    // Generate designs in parallel with retry logic
    const designPromises = selectedTemplates.map(async (template) => {
      console.log('[Preview Designs] Generating design with template:', template.name);

      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[Preview Designs] Attempt ${attempt}/${maxRetries} for template:`, template.name);

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
          console.log(`[Preview] Raw AI response (first 200 chars):`, content.substring(0, 200));
          design = JSON.parse(content);
        } catch (parseError) {
          console.error(`[Preview] Attempt ${attempt}: JSON parse error for template:`, template.name);
          console.error(`[Preview] Parse error details:`, parseError);
          console.error(`[Preview] Full content:`, designResult.choices[0].message.content?.substring(0, 500));
          if (attempt === maxRetries) return null;
          continue; // Retry on parse error
        }

        if (!design.html) {
          console.error(`[Preview] Attempt ${attempt}: No HTML generated for template:`, template.name);
          if (attempt === maxRetries) return null;
          continue; // Retry if no HTML
        }

        // PREMIUM DESIGNS: We WANT colored backgrounds and gradients!
        // Just validate that HTML exists and is complete
        console.log(`[Preview] SUCCESS: Generated premium design for template:`, template.name);

        // Skip the colored background check - we want premium visual designs
        if (false) { // Disabled - we want colored backgrounds for premium designs
          const hasColoredBackground = design.html.toLowerCase().includes('background:') &&
            !design.html.toLowerCase().match(/background:\s*(white|#fff|#ffffff)/gi);

          if (hasColoredBackground) {
            console.warn('[Preview] Max retries reached, rejecting design for:', template.name);
            return null;
          }
          continue; // Retry if colored backgrounds found
        }

        // Check if AI used wrong colors (reject if it used colors not in our palette)
        const allowedColors = [
          template.accentColor.toLowerCase(),
          '#ffffff', '#fff',
          '#1a1a1a', '#2d2d2d', '#333333', '#666666', '#999999', '#cccccc',
          '#f5f5f5', '#f0f0f0', '#000000', '#000',
        ];

        const colorRegex = /#([a-f0-9]{6}|[a-f0-9]{3})\b/gi;
        const foundColors = (design.html.match(colorRegex) || []).map((c: string) => c.toLowerCase());
        const unauthorizedColors = foundColors.filter((c: string) => !allowedColors.includes(c));

        if (unauthorizedColors.length > 0) {
          console.warn(`[Preview] Attempt ${attempt}: Unauthorized colors found:`, unauthorizedColors, 'for template:', template.name);
          if (attempt === maxRetries) {
            console.warn('[Preview] Max retries reached, rejecting design for:', template.name);
            return null;
          }
          continue; // Retry if wrong colors
        }

        // Success - validate contrast and return
        const contrastValidation = validateResumeContrast(design.html);

        console.log(`[Preview] Attempt ${attempt}: Success for template:`, template.name);

        return {
          templateName: template.name,
          templateStyle: template.style,
          layout: template.layout,
          accentColor: template.accentColor,
          html: design.html,
          contrastPassed: contrastValidation.passed,
          contrastSummary: contrastValidation.summary,
        };
      }

      // All retries exhausted
      return null;
    });

    const results = await Promise.all(designPromises);
    const validPreviews = results.filter(r => r !== null);

    console.log('[Preview Designs] Generated', validPreviews.length, 'valid previews');

    return res.json({
      success: true,
      previews: validPreviews,
    });
  } catch (error) {
    console.error('[Preview Designs] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
