import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest, checkRateLimit, getRateLimitIdentifier, setupCORSAndHandleOptions } from '../_shared.js';
import OpenAI from 'openai';
import { getAllTemplates } from '../lib/designTemplates.js';
import { validateResumeContrast } from '../lib/contrastValidator.js';
import { validateATSCompatibility } from '../lib/atsValidator.js';

// Lazy OpenAI client - refresh every hour to pick up env var changes
let _openai: OpenAI | null = null;
let _openaiInitTime = 0;
const OPENAI_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getOpenAI() {
  const now = Date.now();
  if (_openai && (now - _openaiInitTime) < OPENAI_CACHE_TTL) {
    return _openai;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('[Preview] CRITICAL: OPENAI_API_KEY environment variable is not set!');
    console.error('[Preview] Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('API')));
    throw new Error('OPENAI_API_KEY is required');
  }

  console.log('[Preview] Initializing new OpenAI client');
  console.log('[Preview] API Key prefix:', process.env.OPENAI_API_KEY.substring(0, 15) + '...');
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  _openaiInitTime = now;
  return _openai;
}

/**
 * Generate 3 design previews for user to choose from
 * POST /api/resumes/preview-designs
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

    const { resumeId, customPrompt } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    console.log('[Preview Designs] Custom prompt provided:', !!customPrompt);

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
    const designPromises = selectedTemplates.map(async (template, templateIndex) => {
      console.log('[Preview Designs] Generating design with template:', template.name);

      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[Preview Designs] Attempt ${attempt}/${maxRetries} for template:`, template.name);

        // Use custom prompt if provided, otherwise use default template-based prompt
        const systemPrompt = customPrompt || `You are a premium resume designer. Create a visually impressive HTML resume that MAXIMIZES space usage.

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

SPACE OPTIMIZATION (CRITICAL):
- Body padding: 0.5in top/bottom, 0.6in left/right (PROPER margins - prevents cutoff)
- Section spacing: 12-14px between sections (compact)
- Line height: 1.4 (NOT 1.5 or higher)
- List item spacing: 3-4px between bullets
- Minimize ALL whitespace while keeping it readable
- Use EVERY inch of available space

RULES:
- Return ONLY valid JSON: {"html": "<!DOCTYPE html><html>...</html>"}
- Include ALL resume content
- Height: auto (not fixed)
- Make it look expensive and professional
- MAXIMIZE content per page - tight but professional spacing
- NO IMAGES - Do not include <img> tags, profile photos, or external image URLs (NO via.placeholder.com, NO unsplash, NO photos)
- Use text and Unicode symbols only (✉ ☎ 📍 ● ◆ ■)`;

        // Add variation instructions for custom prompts to ensure 3 different designs
        const variationInstructions = customPrompt ? [
          `VARIATION 1: Focus on a traditional, conservative interpretation with clean lines and minimal styling. Section headers should be simple underlines with the accent color. Use proper margins (0.5in/0.6in) and compact spacing.`,
          `VARIATION 2: Add subtle visual elements like small section icons (using Unicode symbols like ■ ◆ ●). Use slightly bolder section headers. Maintain proper spacing - margins 0.5in/0.6in, section gaps 12-14px.`,
          `VARIATION 3: Create a more modern interpretation with subtle borders around sections and clean typography. CRITICAL: Use proper margins (0.5in/0.6in), compact spacing (14px section gaps), and maximize content density. NO excessive whitespace.`
        ][templateIndex] : '';

        let designResult;
        try {
          designResult = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: `Create a premium HTML resume${customPrompt ? ' based on the specifications above' : ` using the ${template.name} template`}.

${customPrompt ? variationInstructions : ''}

CRITICAL SPACE REQUIREMENTS (MUST FOLLOW EXACTLY):
- Body padding: EXACTLY 0.5in top/bottom, 0.6in left/right (padding: 0.5in 0.6in;)
- Section spacing: EXACTLY 12-14px between sections (margin: 14px 0 8px;)
- Line height: EXACTLY 1.4 (line-height: 1.4;)
- List item spacing: EXACTLY 3px (margin-bottom: 3px;)
- NO excessive margins - every pixel counts
- Use ALL available space on the page

CONTENT:
${resume.improved_text || resume.original_text}

${!customPrompt ? `Apply gradient ${template.gradient} and accent color ${template.accentColor}.` : ''}
Return ONLY JSON: {"html": "<!DOCTYPE html>..."}`,
              },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 8000,
          });
        } catch (apiError: any) {
          console.error(`[Preview] ========================================`);
          console.error(`[Preview] OPENAI API ERROR - Attempt ${attempt}/${maxRetries}`);
          console.error(`[Preview] Template:`, template.name);
          console.error(`[Preview] Error type:`, apiError?.constructor?.name);
          console.error(`[Preview] Error message:`, apiError?.message);
          console.error(`[Preview] Error status:`, apiError?.status);
          console.error(`[Preview] Error code:`, apiError?.code);
          console.error(`[Preview] Full error:`, JSON.stringify(apiError, null, 2));
          console.error(`[Preview] API Key present:`, !!process.env.OPENAI_API_KEY);
          console.error(`[Preview] API Key prefix:`, process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
          console.error(`[Preview] ========================================`);
          if (attempt === maxRetries) return null;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          continue; // Retry on API error
        }

        let design;
        try {
          const content = designResult.choices[0].message.content || '{}';
          console.log(`[Preview] Raw AI response (first 200 chars):`, content.substring(0, 200));
          design = JSON.parse(content);
        } catch (parseError) {
          console.error(`[Preview] ========================================`);
          console.error(`[Preview] JSON PARSE ERROR - Attempt ${attempt}/${maxRetries}`);
          console.error(`[Preview] Template:`, template.name);
          console.error(`[Preview] Parse error:`, parseError);
          console.error(`[Preview] Full AI response (first 1000 chars):`, designResult.choices[0].message.content?.substring(0, 1000));
          console.error(`[Preview] This looks like an OpenAI API error response`);
          console.error(`[Preview] ========================================`);
          if (attempt === maxRetries) return null;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          continue; // Retry on parse error
        }

        if (!design.html) {
          console.error(`[Preview] Attempt ${attempt}: No HTML generated for template:`, template.name);
          if (attempt === maxRetries) return null;
          continue; // Retry if no HTML
        }

        // For custom prompts: Validate NO colored backgrounds (white background only)
        if (customPrompt) {
          const htmlLower = design.html.toLowerCase();

          // Check for background-color declarations that aren't white/transparent
          const backgroundMatches = htmlLower.match(/background(-color)?:\s*[^;}\n]+/gi) || [];
          const hasColoredBackground = backgroundMatches.some(match => {
            // Allow: white, transparent, inherit, url(), linear-gradient(), rgba(255,255,255,...)
            // Reject: solid colors like #2563eb, blue, rgb(38, 99, 235), etc.
            const isAllowed = match.match(/:\s*(white|#fff|#ffffff|transparent|none|inherit|url\(|linear-gradient\(|rgba?\(255,\s*255,\s*255)/i);
            return !isAllowed;
          });

          if (hasColoredBackground) {
            console.warn(`[Preview] Attempt ${attempt}: Colored background detected, rejecting for template:`, template.name);
            const badBackgrounds = backgroundMatches.filter(m =>
              !m.match(/:\s*(white|#fff|#ffffff|transparent|none|inherit|url\(|linear-gradient\(|rgba?\(255,\s*255,\s*255)/i)
            );
            console.warn('[Preview] Invalid backgrounds found:', badBackgrounds.slice(0, 5));
            if (attempt === maxRetries) {
              console.warn('[Preview] Max retries reached, rejecting design:', template.name);
              return null;
            }
            continue; // Retry if colored backgrounds found
          }

          console.log(`[Preview] Background validation passed for template:`, template.name);
        }

        // STRICT COLOR VALIDATION - WCAG AA COMPLIANCE REQUIRED
        // For custom prompts: Extract user's selected accent color and only allow WCAG AA compliant colors
        // For default templates: Use template-specific colors
        let userAccentColor = null;
        if (customPrompt) {
          const colorMatch = customPrompt.match(/Accent Color: (#[0-9a-f]{6})/i);
          if (colorMatch) {
            userAccentColor = colorMatch[1].toLowerCase();
          }
        }

        const allowedColors = customPrompt ? [
          // WCAG AA compliant colors only (from questionnaire)
          '#1d4ed8', '#7c3aed', '#047857', '#b91c1c', '#c2410c', '#1e3a8a', '#0f766e', '#1a1a1a', // All accent options
          userAccentColor, // User's selected accent color
          '#1a1a1a', // Headings (17.40:1)
          '#333333', '#333',  // Body text (12.63:1)
          '#595959', // Metadata (7.00:1) - WCAG AA compliant
          '#ffffff', '#fff',  // White background
          '#000000', '#000',  // Pure black (if needed)
        ].filter(Boolean) : [
          // Default template colors (backward compatibility)
          template.accentColor.toLowerCase(),
          '#ffffff', '#fff',
          '#1a1a1a', '#2d2d2d', '#333333', '#666666', '#999999', '#cccccc',
          '#f5f5f5', '#f0f0f0', '#000000', '#000',
        ];

        const colorRegex = /#([a-f0-9]{6}|[a-f0-9]{3})\b/gi;
        const foundColors = (design.html.match(colorRegex) || []).map((c: string) => c.toLowerCase());
        const unauthorizedColors = foundColors.filter((c: string) => !allowedColors.includes(c));

        if (unauthorizedColors.length > 0) {
          console.warn(`[Preview] ========================================`);
          console.warn(`[Preview] COLOR VALIDATION FAILED for:`, template.name);
          console.warn(`[Preview] Attempt ${attempt}/${maxRetries}`);
          console.warn(`[Preview] Unauthorized colors:`, unauthorizedColors);
          console.warn(`[Preview] All found colors:`, foundColors);
          console.warn(`[Preview] Allowed colors:`, allowedColors);
          console.warn(`[Preview] ========================================`);
          if (attempt === maxRetries) {
            console.error(`[Preview] ✗ MAX RETRIES REACHED - REJECTING DESIGN:`, template.name);
            console.error(`[Preview] This design will NOT appear in the preview options`);
            return null;
          }
          continue; // Retry if wrong colors
        }

        console.log(`[Preview] Color validation passed for template:`, template.name);

        // 🔥 NUCLEAR OPTION: COMPLETELY REWRITE CSS FROM SCRATCH 🔥
        // The AI keeps ignoring instructions, so we'll extract the content and rebuild the CSS ourselves
        console.log(`[Preview] ========================================`);
        console.log(`[Preview] 🔥 NUCLEAR POST-PROCESSING: REWRITING ALL CSS 🔥`);
        console.log(`[Preview] Template:`, template.name);
        console.log(`[Preview] ========================================`);

        let processedHtml = design.html;

        // Step 1: Extract font import (we want to keep this)
        const fontImportMatch = processedHtml.match(/(@import\s+url\([^)]+\);)/i);
        const fontImport = fontImportMatch ? fontImportMatch[1] : '';

        // Step 2: Extract font family being used (from existing CSS or use default)
        const existingStyleMatch = processedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        let fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
        if (existingStyleMatch) {
          const fontFamilyMatch = existingStyleMatch[1].match(/font-family:\s*([^;]+);/i);
          if (fontFamilyMatch) {
            fontFamily = fontFamilyMatch[1].trim();
          }
        }

        // Step 3: Extract accent color (from template) - use let since it may be reassigned by custom prompt
        let accentColor = template.accentColor || '#2563eb';

        // Step 4: Build PERFECT CSS from scratch with guaranteed padding
        const perfectCSS = `
${fontImport}

/* CRITICAL RESET - Prevent any inherited padding/margin issues */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* HTML/BODY FOUNDATION - THE PADDING LIVES HERE */
html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-size: 16px;
}

body {
  margin: 0 !important;
  padding: 0.5in 0.6in !important; /* THIS IS THE MARGIN - DO NOT REMOVE */
  width: 100% !important;
  min-height: 100%;
  font-family: ${fontFamily};
  font-size: 11px;
  line-height: 1.4;
  color: #1a1a1a;
  background: white;
  box-sizing: border-box !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ENSURE ALL CONTAINERS ARE FULL WIDTH - NO CENTERING */
.container, .wrapper, .main, .content, .resume, #resume {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* PREVENT ANY ELEMENT FROM BREAKING OUT */
div, section, article, header, main {
  box-sizing: border-box;
  max-width: 100%;
}

/* PRINT MODE - CRITICAL FOR PDF GENERATION */
@page {
  size: letter;
  margin: 0.5in 0.6in; /* Browsers use this instead of body padding in print */
}

@media print {
  html, body {
    width: 8.5in !important;
    height: 11in !important;
    margin: 0 !important;
    padding: 0.5in 0.6in !important;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}

/* TYPOGRAPHY HIERARCHY */
h1, .name { font-size: 28px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.5px; }
h2, .title { font-size: 13px; font-weight: 400; margin-bottom: 8px; color: #666; }
h3, .section-title { font-size: 14px; font-weight: 600; margin: 16px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.5px; }
h4, .job-title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.company { font-size: 12px; font-weight: 600; color: ${accentColor}; }
.date { font-size: 11px; color: #666; font-weight: 400; }
.meta { font-size: 9px; color: #666; }

/* CONTACT INFO */
.contact { font-size: 11px; color: #1a1a1a; margin-bottom: 12px; }
.contact a { color: inherit; text-decoration: none; }

/* EXPERIENCE & EDUCATION SECTIONS */
.experience-item, .education-item {
  margin-bottom: 12px;
  page-break-inside: avoid;
}

.experience-header, .education-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

/* BULLET POINTS */
ul { list-style: none; margin: 4px 0; padding: 0; }
li { padding-left: 12px; position: relative; margin-bottom: 3px; }
li:before { content: "•"; position: absolute; left: 0; color: ${accentColor}; font-weight: 700; }

/* SKILLS */
.skills-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.skill-tag { padding: 3px 8px; background: #f5f5f5; border-radius: 3px; font-size: 10px; color: #1a1a1a; white-space: nowrap; }

/* LINKS */
a { color: ${accentColor}; text-decoration: none; }
a:hover { text-decoration: underline; }

/* SPACING UTILITIES */
.mb-xs { margin-bottom: 4px; }
.mb-sm { margin-bottom: 8px; }
.mb-md { margin-bottom: 12px; }
.mb-lg { margin-bottom: 16px; }
`;

        // Step 5: Strip inline styles from body tag
        processedHtml = processedHtml.replace(
          /<body([^>]*)\s+style\s*=\s*["']([^"']*)["']/gi,
          '<body$1'
        );

        // Step 6: Replace entire <style> block with our perfect CSS
        if (processedHtml.includes('<style')) {
          processedHtml = processedHtml.replace(
            /<style[^>]*>[\s\S]*?<\/style>/i,
            `<style>${perfectCSS}</style>`
          );
          console.log(`[Preview] ✓ REPLACED entire <style> block with perfect CSS`);
        } else {
          // No style block, inject into <head>
          processedHtml = processedHtml.replace(
            '</head>',
            `<style>${perfectCSS}</style></head>`
          );
          console.log(`[Preview] ✓ INJECTED perfect CSS into <head>`);
        }

        // Step 7: Remove ALL external images (profile photos, placeholder images, etc.)
        // Resumes should NEVER have external image URLs - they cause loading errors and are unprofessional
        processedHtml = processedHtml.replace(/<img[^>]*>/gi, '');
        processedHtml = processedHtml.replace(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|svg|webp)/gi, '');
        console.log(`[Preview] ✓ Stripped all external images and image URLs`);

        design.html = processedHtml;

        console.log(`[Preview] ========================================`);
        console.log(`[Preview] ✓ CSS REWRITE COMPLETE`);
        console.log(`[Preview] ✓ Body padding: 0.5in 0.6in !important`);
        console.log(`[Preview] ✓ @page margin: 0.5in 0.6in`);
        console.log(`[Preview] ✓ All containers: width 100%, no centering`);
        console.log(`[Preview] ✓ Print mode: fully configured`);
        console.log(`[Preview] ✓ External images removed`);
        console.log(`[Preview] ========================================`);

        // Validate contrast
        const contrastValidation = validateResumeContrast(design.html);

        // Validate ATS compatibility
        const atsValidation = validateATSCompatibility(design.html);
        console.log(`[Preview] ATS compatibility score: ${atsValidation.score} for template:`, template.name);

        if (atsValidation.score < 70) {
          console.warn(`[Preview] Low ATS score (${atsValidation.score}) for template:`, template.name);
          console.warn(`[Preview] ATS issues:`, atsValidation.issues);
        }

        console.log(`[Preview] Attempt ${attempt}: Success for template:`, template.name);

        // If using custom prompt, extract user preferences for metadata
        let templateName = template.name;
        let templateStyle = template.style;
        let templateLayout = template.layout;
        // accentColor already declared above at line 345

        if (customPrompt) {
          // Parse custom prompt to extract user choices
          const styleMatch = customPrompt.match(/- Style: (\w+)/);
          const layoutMatch = customPrompt.match(/- Layout: ([^\n]+)/);
          const colorMatch = customPrompt.match(/- Accent Color: (#[0-9a-f]{6})/i);

          if (styleMatch) templateStyle = styleMatch[1];
          if (layoutMatch) {
            const layoutText = layoutMatch[1].toLowerCase();
            if (layoutText.includes('single')) templateLayout = 'single-column';
            else if (layoutText.includes('two')) templateLayout = '2-column';
            else if (layoutText.includes('sidebar')) templateLayout = 'sidebar';
            else if (layoutText.includes('asymmetric')) templateLayout = 'asymmetric';
          }
          if (colorMatch) accentColor = colorMatch[1];

          // Generate descriptive name based on user choices
          const styleNames: Record<string, string> = {
            modern: 'Modern',
            classic: 'Classic',
            creative: 'Creative',
            minimalist: 'Minimal',
            professional: 'Professional',
            tech: 'Tech'
          };
          templateName = `Custom ${styleNames[templateStyle] || 'Design'} ${templateIndex + 1}`;
        }

        return {
          templateName,
          templateStyle,
          layout: templateLayout,
          accentColor,
          html: design.html,
          contrastPassed: contrastValidation.passed,
          contrastSummary: contrastValidation.summary,
          atsScore: atsValidation.score,
          atsWarnings: atsValidation.warnings,
          atsIssues: atsValidation.issues,
        };
      }

      // All retries exhausted
      return null;
    });

    const results = await Promise.all(designPromises);
    const validPreviews = results.filter(r => r !== null);

    console.log('[Preview Designs] ========================================');
    console.log('[Preview Designs] DESIGN GENERATION COMPLETE');
    console.log('[Preview Designs] Total designs attempted:', results.length);
    console.log('[Preview Designs] Valid designs generated:', validPreviews.length);
    console.log('[Preview Designs] Failed/Rejected designs:', results.length - validPreviews.length);

    // Log which designs succeeded/failed
    results.forEach((result, index) => {
      if (result === null) {
        console.warn(`[Preview Designs] ✗ Design ${index + 1} FAILED/REJECTED`);
      } else {
        console.log(`[Preview Designs] ✓ Design ${index + 1} SUCCESS:`, result.templateName);
      }
    });
    console.log('[Preview Designs] ========================================');

    if (validPreviews.length === 0) {
      console.error('[Preview Designs] CRITICAL: ALL DESIGNS FAILED VALIDATION!');
      return res.status(500).json({
        error: 'All design generations failed validation',
        message: 'Please try again or contact support',
      });
    }

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
