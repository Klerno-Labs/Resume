import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest, checkRateLimit, getRateLimitIdentifier, setupCORSAndHandleOptions } from '../_shared.js';
import OpenAI from 'openai';
import { getAllTemplates } from '../lib/designTemplates.js';
import { validateResumeContrast } from '../lib/contrastValidator.js';
import { validateATSCompatibility } from '../lib/atsValidator.js';

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
- Body padding: 0.4in top/bottom, 0.5in left/right (TIGHT margins)
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
- MAXIMIZE content per page - tight but professional spacing`;

        // Add variation instructions for custom prompts to ensure 3 different designs
        const variationInstructions = customPrompt ? [
          `VARIATION 1: Focus on a traditional, conservative interpretation with clean lines and minimal styling. Section headers should be simple underlines with the accent color. Use TIGHT margins (0.4in) and compact spacing.`,
          `VARIATION 2: Add subtle visual elements like small section icons (using Unicode symbols like ■ ◆ ●). Use slightly bolder section headers. Maintain TIGHT spacing - margins 0.4in, section gaps 12-14px.`,
          `VARIATION 3: Create a more modern interpretation with subtle borders around sections and clean typography. CRITICAL: Use TIGHT margins (0.4in), compact spacing (14px section gaps), and maximize content density. NO excessive whitespace.`
        ][templateIndex] : '';

        const designResult = await openai.chat.completions.create({
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
- Body padding: EXACTLY 0.4in top/bottom, 0.5in left/right (padding: 0.4in 0.5in;)
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

        // POST-PROCESS: FORCE CORRECT SPACING VALUES (AI often ignores instructions)
        console.log(`[Preview] ========================================`);
        console.log(`[Preview] POST-PROCESSING SPACING for template:`, template.name);
        let processedHtml = design.html;
        const originalLength = processedHtml.length;

        // Extract <style> tag content for debugging
        const styleMatch = processedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleMatch) {
          console.log(`[Preview] Found <style> tag, analyzing CSS...`);
          const originalStyles = styleMatch[1];

          // Check for current spacing values
          const bodyPaddingMatch = originalStyles.match(/body\s*{[^}]*padding:\s*([^;]+);/i);
          const bodyLineHeightMatch = originalStyles.match(/body\s*{[^}]*line-height:\s*([^;]+);/i);
          const h2MarginMatch = originalStyles.match(/h2\s*{[^}]*margin:\s*([^;]+);/i);

          console.log(`[Preview] BEFORE post-processing:`);
          console.log(`  - body padding:`, bodyPaddingMatch ? bodyPaddingMatch[1] : 'NOT FOUND');
          console.log(`  - body line-height:`, bodyLineHeightMatch ? bodyLineHeightMatch[1] : 'NOT FOUND');
          console.log(`  - h2 margin:`, h2MarginMatch ? h2MarginMatch[1] : 'NOT FOUND');
        }

        // AGGRESSIVE APPROACH: Extract entire style block, modify it, replace it
        if (styleMatch) {
          let modifiedStyles = styleMatch[1];

          // 1. Force body padding
          if (/body\s*{[^}]*padding:/i.test(modifiedStyles)) {
            modifiedStyles = modifiedStyles.replace(
              /(body\s*{[^}]*)padding:\s*[^;]+;/gi,
              '$1padding: 0.4in 0.5in;'
            );
            console.log(`[Preview] ✓ Replaced existing body padding`);
          } else {
            modifiedStyles = modifiedStyles.replace(
              /(body\s*{)/gi,
              '$1 padding: 0.4in 0.5in;'
            );
            console.log(`[Preview] ✓ Added missing body padding`);
          }

          // 2. Force body line-height
          if (/body\s*{[^}]*line-height:/i.test(modifiedStyles)) {
            modifiedStyles = modifiedStyles.replace(
              /(body\s*{[^}]*)line-height:\s*[^;]+;/gi,
              '$1line-height: 1.4;'
            );
            console.log(`[Preview] ✓ Replaced existing body line-height`);
          } else {
            modifiedStyles = modifiedStyles.replace(
              /(body\s*{[^}]*)(})/gi,
              '$1 line-height: 1.4;$2'
            );
            console.log(`[Preview] ✓ Added missing body line-height`);
          }

          // 3. Force h2 margins
          if (/h2\s*{[^}]*margin:/i.test(modifiedStyles)) {
            modifiedStyles = modifiedStyles.replace(
              /(h2\s*{[^}]*)margin:\s*[^;]+;/gi,
              '$1margin: 14px 0 8px 0;'
            );
            console.log(`[Preview] ✓ Replaced existing h2 margin`);
          }

          // 4. Force li margins
          if (/li\s*{[^}]*margin-bottom:/i.test(modifiedStyles)) {
            modifiedStyles = modifiedStyles.replace(
              /(li\s*{[^}]*)margin-bottom:\s*[^;]+;/gi,
              '$1margin-bottom: 3px;'
            );
            console.log(`[Preview] ✓ Replaced existing li margin-bottom`);
          }

          // 5. Reduce excessive margins anywhere (>25px becomes 14px)
          const excessiveMarginCount = (modifiedStyles.match(/margin:\s*([3-9]\d|[1-9]\d\d+)px/gi) || []).length;
          if (excessiveMarginCount > 0) {
            modifiedStyles = modifiedStyles.replace(
              /margin:\s*([3-9]\d|[1-9]\d\d+)px/gi,
              'margin: 14px'
            );
            console.log(`[Preview] ✓ Reduced ${excessiveMarginCount} excessive margins to 14px`);
          }

          // 6. Replace entire style block
          processedHtml = processedHtml.replace(
            /<style[^>]*>[\s\S]*?<\/style>/i,
            `<style>${modifiedStyles}</style>`
          );

          // Verify changes
          const verifyMatch = processedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
          if (verifyMatch) {
            const verifiedStyles = verifyMatch[1];
            const newBodyPadding = verifiedStyles.match(/body\s*{[^}]*padding:\s*([^;]+);/i);
            const newBodyLineHeight = verifiedStyles.match(/body\s*{[^}]*line-height:\s*([^;]+);/i);

            console.log(`[Preview] AFTER post-processing:`);
            console.log(`  - body padding:`, newBodyPadding ? newBodyPadding[1] : 'NOT FOUND');
            console.log(`  - body line-height:`, newBodyLineHeight ? newBodyLineHeight[1] : 'NOT FOUND');
          }
        } else {
          console.warn(`[Preview] WARNING: No <style> tag found in HTML!`);
        }

        const changesApplied = originalLength !== processedHtml.length;
        console.log(`[Preview] Spacing enforcement complete. Changes applied:`, changesApplied);
        console.log(`[Preview] ========================================`);

        // CRITICAL FIX: FORCE REMOVE MAX-WIDTH AND CENTERING
        // AI keeps ignoring instructions and creating narrow centered containers
        console.log(`[Preview] FORCING full-width layout (removing max-width and centering)...`);

        // Check for problematic max-width values
        const maxWidthMatches = processedHtml.match(/max-width:\s*[^;]+;/gi);
        if (maxWidthMatches) {
          console.log(`[Preview] Found ${maxWidthMatches.length} max-width declarations:`, maxWidthMatches.slice(0, 5));
        }

        if (styleMatch) {
          let widthFixedStyles = processedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || '';

          // REMOVE all max-width declarations that create narrow containers
          // Keep max-width: 100% but remove specific pixel/inch values
          widthFixedStyles = widthFixedStyles.replace(
            /max-width:\s*(?!100%|none)[^;]+;/gi,
            ''
          );
          console.log(`[Preview] ✓ Removed restrictive max-width declarations`);

          // REMOVE margin: 0 auto (causes centering)
          widthFixedStyles = widthFixedStyles.replace(
            /margin:\s*0\s+auto;?/gi,
            'margin: 0;'
          );
          widthFixedStyles = widthFixedStyles.replace(
            /margin:\s*auto;?/gi,
            'margin: 0;'
          );
          console.log(`[Preview] ✓ Removed auto margins (centering)`);

          // FORCE container/main/body to use full width
          widthFixedStyles = widthFixedStyles.replace(
            /(\.container|\.main|body)\s*{([^}]*?)}/gi,
            (match, selector, props) => {
              // Remove any width or max-width properties
              let cleanProps = props.replace(/max-width:\s*[^;]+;?/gi, '');
              cleanProps = cleanProps.replace(/width:\s*(?!100%)[^;]+;?/gi, 'width: 100%;');

              // Ensure width: 100% is present
              if (!/width:\s*100%/i.test(cleanProps)) {
                cleanProps += ' width: 100%;';
              }

              return `${selector} {${cleanProps}}`;
            }
          );
          console.log(`[Preview] ✓ Forced container elements to width: 100%`);

          // Replace the style block
          processedHtml = processedHtml.replace(
            /<style[^>]*>[\s\S]*?<\/style>/i,
            `<style>${widthFixedStyles}</style>`
          );

          // Verify the fix
          const verification = processedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || '';
          const remainingMaxWidth = (verification.match(/max-width:\s*(?!100%|none)[^;]+;/gi) || []).length;
          const remainingAutoMargin = (verification.match(/margin:\s*(0\s+)?auto/gi) || []).length;

          console.log(`[Preview] WIDTH FIX VERIFICATION:`);
          console.log(`  - Remaining restrictive max-width:`, remainingMaxWidth);
          console.log(`  - Remaining auto margins:`, remainingAutoMargin);

          if (remainingMaxWidth > 0 || remainingAutoMargin > 0) {
            console.warn(`[Preview] WARNING: Still has centering/max-width issues!`);
          } else {
            console.log(`[Preview] ✓ Full-width enforcement successful`);
          }
        }

        design.html = processedHtml;

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
        let accentColor = template.accentColor;

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
