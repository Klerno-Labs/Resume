import OpenAI from 'openai';
import { sql } from '../_shared.js';
import { getRandomTemplate } from './designTemplates.js';
import { validateResumeContrast } from './contrastValidator.js';

let _openai: OpenAI | null = null;

function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function processResume(resumeId: string, originalText: string, userId: string, userPlan: string) {
  try {
      const openai = getOpenAI();

    // Run optimization and scoring in parallel (fast)
    // Design generation happens after in background to avoid timeout
    const [optimizationResult, scoreResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert ATS (Applicant Tracking System) optimization specialist and career coach. Your task is to transform resumes into ATS-optimized, professional documents that will achieve 90%+ ATS scores. You understand how ATS systems parse, rank, and filter resumes. Always output valid JSON with an "improvedText" field containing the complete rewritten resume.'
          },
          {
            role: 'user',
            content: `Rewrite this resume to achieve MAXIMUM ATS compatibility (90%+ score). Follow these CRITICAL ATS optimization guidelines:

ATS-FRIENDLY FORMATTING (CRITICAL):
1. Use ONLY standard section headers: "Professional Summary", "Work Experience", "Skills", "Education", "Certifications"
2. Use simple, clean formatting - NO tables, NO text boxes, NO columns, NO graphics
3. Use standard date format: "Month YYYY - Month YYYY" (e.g., "January 2022 - December 2023")
4. Place dates on the same line as job titles, separated by |
5. Use standard bullet points (•) - no fancy symbols or icons
6. Keep formatting simple and linear - single column layout
7. Each job should follow this exact format:
   Company Name | Job Title | Month YYYY - Month YYYY
   • Achievement with quantifiable results
   • Achievement with quantifiable results

CONTENT OPTIMIZATION (HIGH-IMPACT):
1. Use powerful action verbs at the start of EVERY bullet point:
   - Leadership: Led, Directed, Managed, Supervised, Coordinated, Spearheaded
   - Achievement: Achieved, Exceeded, Delivered, Attained, Accomplished
   - Improvement: Improved, Enhanced, Optimized, Streamlined, Transformed
   - Creation: Created, Developed, Designed, Built, Established, Launched
   - Analysis: Analyzed, Evaluated, Assessed, Investigated, Researched
2. QUANTIFY EVERY achievement with specific metrics:
   - Revenue/Sales: "Increased revenue by $500K (25%)"
   - Efficiency: "Reduced processing time by 40%"
   - Team/Scale: "Managed team of 15 engineers"
   - Volume: "Processed 1000+ customer requests monthly"
3. Remove ALL weak language:
   - Delete: "some", "various", "several", "many", "helped with", "assisted in", "participated in"
   - Replace: "Responsible for X" → "Managed X" or "Led X"
   - Replace: "Worked on Y" → "Developed Y" or "Implemented Y"
4. Make bullet points concise (1-2 lines max), impact-focused, and results-driven

KEYWORD OPTIMIZATION (ATS RANKING):
1. Include industry-specific keywords naturally in achievements
2. Mirror common job posting language (without keyword stuffing)
3. Include technical skills, tools, and methodologies used
4. Add relevant certifications and credentials
5. Use both acronyms AND full terms (e.g., "CRM (Customer Relationship Management)")

PROFESSIONAL SUMMARY (CRITICAL FOR ATS):
1. Start with a 3-4 line Professional Summary section
2. Include: Years of experience, key expertise areas, notable achievements
3. Pack with relevant keywords (title, industry terms, core skills)
4. Example: "Results-driven Marketing Manager with 8+ years driving digital growth. Expert in SEO, PPC, and content strategy. Increased organic traffic by 300% and generated $2M in revenue through data-driven campaigns."

SKILLS SECTION (ATS KEYWORD MATCHING):
1. Create a dedicated "Skills" section with 15-25 relevant skills
2. Group by category: "Technical Skills:", "Soft Skills:", "Tools & Platforms:"
3. Use exact skill names from job postings (e.g., "Microsoft Excel", not "Excel")
4. Include both hard and soft skills
5. Prioritize skills with high industry demand

Resume to improve:
${originalText.substring(0, 3000)}

Return ONLY valid JSON in this exact format:
{"improvedText": "the complete improved resume text here"}

REMEMBER: Format must be ATS-parseable (simple, linear, no tables). Content must be achievement-focused with quantified results. Every bullet starts with a strong action verb.`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a strict ATS (Applicant Tracking System) evaluator and optimization expert. You analyze resumes using the same criteria as Fortune 500 company ATS systems (Taleo, Workday, iCIMS, Greenhouse). Your scores are rigorous - a resume must be EXCELLENT to score 90+. Always output valid JSON.'
          },
          {
            role: 'user',
            content: `Analyze this resume using strict ATS criteria. Be DEMANDING in your evaluation.

Resume:
${originalText.substring(0, 1200)}

STRICT EVALUATION CRITERIA:

1. ATS Score (0-100) - How well would this pass Fortune 500 ATS systems?
   MUST CHECK:
   ✓ Standard section headers (Professional Summary, Work Experience, Skills, Education)
   ✓ Simple formatting (no tables, columns, text boxes, graphics)
   ✓ Consistent date formats (Month YYYY - Month YYYY)
   ✓ Keywords and industry terms present throughout
   ✓ Quantifiable achievements (numbers, percentages, metrics)
   ✓ Strong action verbs starting every bullet
   ✓ No weak language ("some", "various", "helped with")
   ✓ Relevant skills section with 15+ skills
   ✓ Professional summary with keywords
   ✓ Clean, parseable structure (single column, linear)

   SCORING GUIDE:
   - 90-100: EXCELLENT - Passes all major ATS systems, top 10% of resumes
   - 80-89: GOOD - Passes most ATS, but has 2-3 minor issues
   - 70-79: AVERAGE - Passes basic ATS, needs improvement
   - 60-69: POOR - May be rejected by ATS, major formatting or keyword issues
   - Below 60: FAIL - Will likely be auto-rejected

2. Keywords Score (0-10) - Presence of relevant keywords and action verbs
   - 9-10: Rich with industry keywords, strong action verbs, ATS-optimized
   - 7-8: Good keyword presence, most bullets have action verbs
   - 5-6: Some keywords, inconsistent action verbs
   - 3-4: Few keywords, weak verbs ("responsible for", "helped")
   - 0-2: No keywords, passive language, will fail ATS

3. Formatting Score (0-10) - ATS-parseable structure and consistency
   - 9-10: Perfect ATS formatting (simple, linear, standard headers)
   - 7-8: Good formatting with 1-2 minor issues
   - 5-6: Some formatting issues (inconsistent dates, non-standard headers)
   - 3-4: Major issues (tables, columns, graphics, special characters)
   - 0-2: Unparseable by ATS (complex layouts, images, text boxes)

4. Issues - Be SPECIFIC and ACTIONABLE. List 3-7 critical issues to fix.
   Common issues to check for:
   - Weak verbs ("responsible for", "helped with", "worked on")
   - Missing metrics/quantification ("increased sales" vs "increased sales by 25%")
   - Non-standard section headers ("Career History" instead of "Work Experience")
   - Complex formatting (tables, columns, text boxes)
   - Inconsistent date formats
   - Missing keywords or industry terms
   - No Professional Summary
   - Skills section too short (<10 skills) or missing
   - Passive language instead of active achievements

Return ONLY valid JSON in this exact format:
{
  "atsScore": 75,
  "keywordsScore": 6,
  "formattingScore": 7,
  "issues": [
    {"type": "weak-language", "message": "Replace 'responsible for managing team' with 'Managed team of 12 engineers'", "severity": "high"},
    {"type": "missing-metrics", "message": "Add quantifiable results: 'Increased revenue by X%' or 'Reduced costs by $X'", "severity": "high"},
    {"type": "formatting", "message": "Use standard header 'Work Experience' instead of 'Career History'", "severity": "medium"},
    {"type": "keywords", "message": "Add more industry-specific keywords in Skills and Summary sections", "severity": "medium"}
  ]
}

BE STRICT: Only exceptional resumes score 90+. Most resumes need improvement.`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
      }),
    ]);

    const optimization = JSON.parse(optimizationResult.choices[0].message.content || '{}');
    const scores = JSON.parse(scoreResult.choices[0].message.content || '{}');

    const improvedText = optimization.improvedText || originalText;

    // Update resume with text improvements and mark as completed
    // Design will be generated by separate API endpoint to avoid timeout
    await sql`
      UPDATE resumes SET
        improved_text = ${improvedText},
        ats_score = ${scores.atsScore || 70},
        keywords_score = ${scores.keywordsScore || 7},
        formatting_score = ${scores.formattingScore || 7},
        issues = ${JSON.stringify(scores.issues || [])},
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;

    console.log(`[Process] Resume ${resumeId} text optimization completed - design will be generated separately`);
  } catch (error) {
    console.error('[Process] Error optimizing resume:', error);
      await sql`UPDATE resumes SET status = 'failed' WHERE id = ${resumeId}`;

    if (userPlan !== 'admin') {
      await sql`UPDATE users SET credits_remaining = credits_remaining + 1 WHERE id = ${userId}`;
      console.log(`[Credit] Refunded 1 credit to user ${userId} due to optimization failure`);
    }
  }
}

// Separate function for design generation (called by separate API endpoint)
export async function generateResumeDesign(resumeId: string) {
  try {
      const openai = getOpenAI();

    // Get resume data
    const resumes = await sql`SELECT improved_text, original_text FROM resumes WHERE id = ${resumeId}`;
    if (resumes.length === 0) {
      throw new Error('Resume not found');
    }

    const resume = resumes[0];
    const improvedText = resume.improved_text || resume.original_text;

    // Get a random unique design template (now async!)
    const template = await getRandomTemplate();

    console.log(`[Design] Starting design generation for resume ${resumeId}`);

    const designResult = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a minimalist resume designer creating expensive-looking resumes for 2025. Your designs are EXTREMELY MINIMAL, clean, and typographically disciplined. Key principles: (1) MAXIMIZE space usage - tight margins (0.4-0.5 inch), compact spacing, fit maximum content, (2) ONE professional font only (Lato, Calibri, or Georgia) at 10-11pt body, 11-12pt headers, 14-18pt name, (3) ONE subtle accent color for structure only (navy, deep green, or burgundy), (4) Perfect alignment and pixel-precise spacing consistency, (5) NO icons, NO photos, NO graphics, NO decorative elements, (6) Looks like a premium business document first, designed object second. Think: minimalist luxury, Swiss design, NOT Canva templates. Always output valid JSON.`
        },
        {
          role: 'user',
          content: `Create an EXTREMELY MINIMAL, CLEAN resume design in HTML/CSS that looks like an expensive 2025 business document - NOT a Canva template.

Resume content:
${improvedText}

TEMPLATE SPECIFICATION:
Name: ${template.name}
Style: ${template.style}
Layout Type: ${template.layout}
Gradient: ${template.gradient}
Accent: ${template.accentColor}
Fonts: ${template.fonts[0]} (headers), ${template.fonts[1]} (body)

🎨 MINIMALIST DESIGN REQUIREMENTS (CRITICAL - MAXIMIZE SPACE, ZERO CLUTTER):

1. LAYOUT - ${template.layout.toUpperCase()} STRUCTURE:
${template.layout === '2-column' ? `   ✓ Grid: display: grid; grid-template-columns: 280px 1fr; min-height: 100%;
   ✓ SIDEBAR (280px): Gradient background ${template.gradient}, full height, tight padding (20px)
   ✓ MAIN (remaining): Pure white (#ffffff), tight margins (28px), compact spacing
   ✓ Name at TOP of sidebar: Medium (26px), bold (700), ${template.fonts[0]}, white, letter-spacing: 0px
   ✓ Job title below name: 12px, ${template.fonts[1]}, white, opacity: 0.95, compact spacing
   ✓ NO photo - use elegant monogram circle instead: 70px circle with initials, subtle border` : ''}${template.layout === 'single-column' ? `   ✓ Container: width: 100%, min-height: 100%, NO max-width (use full page width)
   ✓ Name: Medium (28px), bold, ${template.fonts[0]}, color: ${template.accentColor}, letter-spacing: 0px
   ✓ Job title: 13px, ${template.fonts[1]}, below name, margin: 4px 0
   ✓ Contact info: Horizontal row beneath title, 10px, separated by bullets (•)
   ✓ Sections: Full-width blocks with compact spacing (14px between), left-aligned content
   ✓ Headers: Left-aligned, 14px, uppercase, ${template.accentColor}, underline or bottom border` : ''}${template.layout === 'timeline' ? `   ✓ Container: width: 100%, min-height: 100%, NO max-width (use full page width)
   ✓ Header: Name (36px), title (14px), contact - at top
   ✓ Timeline: Vertical line on left (3px solid ${template.accentColor}), connecting experience items
   ✓ Timeline dots: 16px circles on the line at each job, filled with ${template.accentColor}
   ✓ Experience cards: Offset from timeline (margin-left: 40px), with date badges
   ✓ Dates: Small badges (10px) positioned on timeline, background ${template.accentColor}, white text
   ✓ Visual flow: Connecting lines between timeline dots create career progression visualization` : ''}${template.layout === 'skills-first' ? `   ✓ Container: width: 100%, min-height: 100%, NO max-width (use full page width)
   ✓ Header: Name (34px) and title (14px) at top, ${template.accentColor}
   ✓ Skills Section: Immediately below header, prominent placement (top 25% of page)
   ✓ Skills Display: Grid of pills (3-4 columns), padding: 8px 16px, background: ${template.accentColor}15, border: 1px solid ${template.accentColor}50
   ✓ OR Skill bars: Horizontal bars showing proficiency, filled portion ${template.accentColor}
   ✓ Experience: Standard format below skills, condensed to fit remaining space
   ✓ Visual hierarchy: Skills visually dominant, larger and more colorful than experience` : ''}${template.layout === 'split-column' ? `   ✓ Grid: display: grid; grid-template-columns: 1fr 1fr; gap: 20px; min-height: 100%
   ✓ Header: Spans both columns, name (28px) and title (12px), ${template.accentColor}
   ✓ Left column: Experience (chronological work history)
   ✓ Right column: Skills, Education, Certifications
   ✓ Equal weight: Both columns same width (50/50), balanced visual importance
   ✓ Divider: Optional subtle vertical line between columns (1px, #e5e7eb)
   ✓ Symmetry: Matching spacing and alignment in both columns` : ''}${template.layout === 'header-banner' ? `   ✓ Banner: Full-width header (height: 180px), gradient ${template.gradient}, contains name and contact
   ✓ Name in banner: 36px, bold, white, ${template.fonts[0]}, left-aligned with padding
   ✓ Title in banner: 14px, white, opacity 0.95, below name
   ✓ Contact in banner: Horizontal row, white icons/text, 11px
   ✓ Content below: 2-3 column grid (grid-template-columns: 1fr 2fr or three columns)
   ✓ Banner shadow: box-shadow: 0 4px 12px rgba(0,0,0,0.1) for depth
   ✓ Visual impact: Banner creates strong first impression, content organized beneath` : ''}

2. TYPOGRAPHY - MINIMAL & DISCIPLINED (USE ONE FONT ONLY):
   ✓ Load ONE Google Font: <link href="https://fonts.googleapis.com/css2?family=${template.fonts[0].replace(/ /g, '+')}:wght@400;600;700&display=swap">
   ✓ ALL text uses ${template.fonts[0]} - header AND body (consistency is key to minimalism)
   ✓ Name: 14-18pt (19-24px), font-weight: 700, ${template.fonts[0]}, black or white, letter-spacing: 0px (no excessive tracking)
   ✓ Job Title: 11-12pt (15-16px), font-weight: 400, ${template.fonts[0]}, margin-top: 4px
   ✓ Section Headers: 11-12pt (15-16px), font-weight: 600, ${template.fonts[0]}, ${template.accentColor} OR black, uppercase, letter-spacing: 0.5px MAX, margin-bottom: 12px, simple 1px underline
   ✓ Body Text: 10-11pt (13-15px), font-weight: 400, ${template.fonts[0]}, #1a1a1a (dark gray, good contrast), line-height: 1.5
   ✓ Dates/Meta: Same 10-11pt as body, font-weight: 400, #666666 (medium gray), NOT italic (too decorative)

3. COLOR PALETTE - EXTREMELY RESTRAINED (ONE ACCENT MAX):
   ✓ Background: Pure white (#ffffff) - no textures, no gradients in main area
   ✓ Primary Text: #1a1a1a (near black with good contrast)
   ✓ Secondary Text: #666666 (medium gray for dates/metadata only)
   ✓ Accent Color: ${template.accentColor} - use SPARINGLY for section headers or name only
   ✓ Sidebar (if used): ${template.gradient} OR solid ${template.accentColor} - keep text white with excellent contrast
   ✓ NO decorative colors, NO multiple accent colors, NO colorful skill badges
   ✓ Skill Display: Simple text list OR minimal pills with light gray background (#f5f5f5), black text

4. SPACING & WHITESPACE - MAXIMIZE SPACE (CRITICAL):
   ✓ Page Margins: 0.5-0.6 inch (36-43px) on all sides - professional margins for readability
   ✓ Section Spacing: 12-16px between major sections (compact but readable)
   ✓ Line Height: 1.4 for body text (compact for maximum content)
   ✓ Paragraph Spacing: 3-4px between bullet points, 8-10px between job entries
   ✓ Vertical Rhythm: Consistent spacing grid (4px, 8px, 12px, 16px)
   ✓ Letter Spacing: 0-0.5px MAX (no excessive tracking - looks amateur)
   ✓ GOAL: Fit maximum content on page while maintaining professional appearance

5. MINIMAL DETAILS - NO DECORATION, ONLY STRUCTURE:
   ✓ NO shadows, NO gradients (except sidebar background if template requires)
   ✓ NO icons - text only (email, phone, location written out or simple symbols)
   ✓ NO emoji - absolutely forbidden (📧 ☎ etc. look unprofessional)
   ✓ Dividers: Simple 1px lines only, color #e5e5e5 (light gray), used sparingly
   ✓ Bullet Points: Standard • or – (hyphen), color #1a1a1a, NO custom shapes or colors
   ✓ Job Titles: font-weight: 600, same size as body text, color: #1a1a1a
   ✓ Company Names: font-weight: 600 OR 400, color: ${template.accentColor} OR #1a1a1a, margin-bottom: 4px
   ✓ Contact Info: Plain text separated by | or • separator, NO icons

6. WHAT MAKES IT EXPENSIVE - RESTRAINT & PRECISION:
   ✓ NO monogram circles - minimalism means removing decoration
   ✓ NO textures, NO patterns - flat design only
   ✓ Print-friendly: All measurements in px, @page { margin: 0; size: letter; }
   ✓ Perfect Alignment: Every element aligns to a strict grid
   ✓ Hierarchy through SIZE & WEIGHT only: Name (larger, bolder) > Section Headers (medium, semibold) > Body (regular weight)
   ✓ Pixel-precise consistency: All spacing follows 8px grid (8, 12, 16, 24, 32, etc.)
   ✓ Quality is in the ABSENCE of decoration, not the presence

7. SINGLE-PAGE CONSTRAINT (CRITICAL - MAXIMIZE CONTENT AND SPACE):
   ✓ Page Size: width: 8.5in (612pt), height: 11in (842pt) - US Letter
   ✓ Container: width: 100%, height: 100%, NO max-width or centering - USE FULL PAGE WIDTH
   ✓ Body padding: EXACTLY 0.5in top/bottom, 0.6in left/right (this creates the margins - CRITICAL FOR READABILITY)
   ✓ Content area: Should span from left margin to right margin - NO narrow centered containers
   ✓ Font sizes: Precisely calculated - Name 26-28px, Headers 14px, Body 10-11px, Meta 9px
   ✓ Strategic spacing: Use TIGHT spacing - section gaps 12-14px, line-height 1.4
   ✓ If too long: Reduce bullet points to 2-3 per job, shorten summary, prioritize recent experience
   ✓ CSS: html { margin: 0; padding: 0; height: 100%; } body { margin: 0; padding: 0.5in 0.6in !important; box-sizing: border-box; width: 100%; height: 100%; }
   ✓ CRITICAL: Body MUST have padding for margins - NO padding: 0 on body element
   ✓ GOAL: Fit ALL content on one page, use full horizontal space WITH proper side margins (0.6in each side)

8. CODE STRUCTURE - CLEAN & SEMANTIC:
   ✓ DOCTYPE: <!DOCTYPE html>
   ✓ Full Google Fonts link with multiple weights
   ✓ ALL CSS in <style> tag (no external files)
   ✓ Semantic HTML5: <header>, <section>, <article>, <aside>
   ✓ Print CSS: @page { margin: 0.5in 0.6in; size: letter; } @media print { body { padding: 0.5in 0.6in !important; } }

9. EXAMPLES OF MINIMAL STRUCTURE (Study these - TIGHT SPACING):
   ✓ Name Section: Name (26-28px, bold, letter-spacing: 0px) → Title (13px, regular, margin-top: 3px) → Contact (plain text: email | phone | location, 11px)
   ✓ Experience Entry: Company (12px, ${template.accentColor} OR #1a1a1a, semibold) | Job Title (12px, #1a1a1a, semibold) | Dates (11px, #666666, regular, right-aligned) → Standard • bullets (3px spacing)
   ✓ Skills Section: Simple comma-separated list OR minimal boxes: padding: 3px 6px, background: #f5f5f5, border: none, font-size: 11px, color: #1a1a1a
   ✓ Section Header: Text (14px, uppercase OR sentence case, letter-spacing: 0px, ${template.accentColor} OR #1a1a1a) + 1px bottom border + 8px margin-bottom

💎 FINAL QUALITY CHECK - DOES IT LOOK LIKE AN EXPENSIVE 2025 MINIMAL RESUME?
   ✓ Typography: ONE font only, perfect hierarchy through size/weight, NO excessive letter-spacing
   ✓ Color: ONE accent color used sparingly, mostly black/gray text on white
   ✓ Space Usage: MAXIMIZED content per page, professional margins (0.5-0.6 inch), compact spacing
   ✓ Zero Clutter: NO icons, NO photos, NO monograms, NO decorative elements, NO shadows
   ✓ Overall: Looks like a premium business document, NOT a Canva template. Clean, minimal, expensive.
   ✓ Content Fit: ALL resume content fits on one page through efficient spacing
   ✓ CRITICAL WIDTH CHECK: Content spans FULL width of page (left margin to right margin), NO narrow centered containers, NO max-width under 100%

CRITICAL: You MUST return ONLY a single JSON object. Do NOT include any markdown, explanations, apologies, or extra text.
Start your response with { and end with }. Nothing else.

Expected JSON format:
{
  "html": "<!DOCTYPE html><html>...complete polished HTML...</html>",
  "templateName": "${template.name}",
  "style": "${template.style}",
  "colorScheme": "${template.accentColor}"
}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    });

    console.log(`[Design] OpenAI design API call completed for resume ${resumeId}`);

    let design;
    try {
      const content = designResult.choices[0].message.content || '{}';
      design = JSON.parse(content);
    } catch (parseError) {
      console.error('[Design] JSON parse error:', parseError);
      console.error('[Design] Raw content:', designResult.choices[0].message.content?.substring(0, 500));
      throw new Error('AI generated invalid JSON format');
    }
    let designHtml = design.html;

    if (!designHtml) {
      throw new Error('No HTML generated');
    }

    // POST-PROCESS: FORCE FULL-WIDTH LAYOUT (AI ignores instructions)
    console.log('[Design] POST-PROCESSING: Forcing full-width layout...');
    const styleMatch = designHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);

    if (styleMatch) {
      let styles = styleMatch[1];

      // Count issues before fixing
      const beforeMaxWidth = (styles.match(/max-width:\s*(?!100%|none)[^;]+;/gi) || []).length;
      const beforeAutoMargin = (styles.match(/margin:\s*(0\s+)?auto/gi) || []).length;

      console.log('[Design] BEFORE width fixes:', { maxWidthCount: beforeMaxWidth, autoMarginCount: beforeAutoMargin });

      // REMOVE restrictive max-width (keep only max-width: 100% or none)
      styles = styles.replace(/max-width:\s*(?!100%|none)[^;]+;/gi, '');

      // REMOVE centering auto margins
      styles = styles.replace(/margin:\s*0\s+auto;?/gi, 'margin: 0;');
      styles = styles.replace(/margin:\s*auto;?/gi, 'margin: 0;');

      // FORCE container/main/body to full width
      styles = styles.replace(
        /(\.container|\.main|body|html)\s*{([^}]*?)}/gi,
        (match, selector, props) => {
          let cleanProps = props;

          // Remove restrictive width/max-width
          cleanProps = cleanProps.replace(/max-width:\s*(?!100%|none)[^;]+;?/gi, '');
          cleanProps = cleanProps.replace(/width:\s*(?!100%)[^;]+;?/gi, 'width: 100%;');

          // Ensure width: 100%
          if (!/width:\s*100%/i.test(cleanProps)) {
            cleanProps += ' width: 100%;';
          }

          return `${selector} {${cleanProps}}`;
        }
      );

      // FORCE body padding to create proper margins (CRITICAL - prevents content cutoff)
      // Handle patterns like: body {, html body {, body, html {, etc.
      const bodyPaddingRegex = /([^}]*\bbody\b[^{]*)\{([^}]*)\}/gi;
      let bodyRuleFound = false;

      styles = styles.replace(bodyPaddingRegex, (match, selector, props) => {
        if (!selector.includes('body')) return match; // Safety check
        bodyRuleFound = true;

        let bodyProps = props;
        // Remove any existing padding
        bodyProps = bodyProps.replace(/padding:\s*[^;]+;?/gi, '');
        // Remove box-sizing if exists
        bodyProps = bodyProps.replace(/box-sizing:\s*[^;]+;?/gi, '');
        // Remove line-height if exists
        bodyProps = bodyProps.replace(/line-height:\s*[^;]+;?/gi, '');

        // Add our properties at the start
        bodyProps = 'padding: 0.5in 0.6in !important; box-sizing: border-box; line-height: 1.4;' + bodyProps;

        console.log('[Design] ✓ Forced body padding to 0.5in 0.6in for selector:', selector.trim());
        return `${selector}{${bodyProps}}`;
      });

      if (!bodyRuleFound) {
        // No body rule found, add one
        styles += '\nbody { padding: 0.5in 0.6in !important; box-sizing: border-box; line-height: 1.4; }';
        console.log('[Design] ✓ Added new body rule with 0.5in 0.6in padding');
      }

      // Replace style block
      designHtml = designHtml.replace(
        /<style[^>]*>[\s\S]*?<\/style>/i,
        `<style>${styles}</style>`
      );

      // Verify fixes
      const verifyStyles = designHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || '';
      const afterMaxWidth = (verifyStyles.match(/max-width:\s*(?!100%|none)[^;]+;/gi) || []).length;
      const afterAutoMargin = (verifyStyles.match(/margin:\s*(0\s+)?auto/gi) || []).length;

      console.log('[Design] AFTER width fixes:', { maxWidthCount: afterMaxWidth, autoMarginCount: afterAutoMargin });
      console.log('[Design] ✓ Full-width enforcement complete');
    } else {
      console.warn('[Design] WARNING: No <style> tag found - cannot enforce full-width!');
    }

    // CRITICAL FIX: Remove inline padding from <body> tag (AI adds this and it overrides our CSS!)
    console.log('[Design] Checking for inline body styles that override padding...');
    designHtml = designHtml.replace(
      /<body([^>]*)\s+style\s*=\s*["']([^"']*)["']/gi,
      (match, beforeStyle, styleContent) => {
        const originalStyle = styleContent;
        // Remove padding from inline styles
        let cleanedStyle = styleContent.replace(/padding:\s*[^;]+;?/gi, '');
        // Remove margin from inline styles
        cleanedStyle = cleanedStyle.replace(/margin:\s*[^;]+;?/gi, '');

        if (originalStyle !== cleanedStyle) {
          console.log('[Design] ✓ Stripped inline padding/margin from <body> tag');
          console.log('[Design]   BEFORE:', originalStyle);
          console.log('[Design]   AFTER:', cleanedStyle);
        }

        // If style is now empty, remove the attribute entirely
        if (cleanedStyle.trim() === '') {
          return `<body${beforeStyle}`;
        }
        return `<body${beforeStyle} style="${cleanedStyle}"`;
      }
    );

    // CRITICAL FIX #2: Strip padding/margin from container divs that cancel body padding
    console.log('[Design] Checking for container divs with problematic padding/margins...');
    const containerStyleMatch = designHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (containerStyleMatch) {
      let containerStyles = containerStyleMatch[1];

      // Remove padding and negative margins from .container, .wrapper, .main, etc.
      containerStyles = containerStyles.replace(
        /(\.container|\.wrapper|\.main|\.content|div\.resume|#resume)\s*{([^}]*?)}/gi,
        (match, selector, props) => {
          let cleanProps = props;

          // Remove padding declarations
          const hadPadding = /padding:/i.test(cleanProps);
          cleanProps = cleanProps.replace(/padding:\s*[^;]+;?/gi, '');

          // Remove negative margins (these cancel body padding!)
          const hadNegMargin = /margin:\s*-/i.test(cleanProps);
          cleanProps = cleanProps.replace(/margin:\s*-[^;]+;?/gi, '');

          if (hadPadding || hadNegMargin) {
            console.log('[Design] ✓ Removed problematic styles from', selector);
          }

          return `${selector} {${cleanProps}}`;
        }
      );

      designHtml = designHtml.replace(
        /<style[^>]*>[\s\S]*?<\/style>/i,
        `<style>${containerStyles}</style>`
      );
      console.log('[Design] ✓ Container padding/margin cleanup complete');
    }

    // CRITICAL FIX #3: Force correct @page margins for print (browsers strip body padding in print mode!)
    console.log('[Design] Fixing @page margins for print...');
    const pageStyleMatch = designHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (pageStyleMatch) {
      let pageStyles = pageStyleMatch[1];

      // Remove bad @page rules (margin: 0)
      pageStyles = pageStyles.replace(/@page\s*{[^}]*}/gi, '');

      // Add correct @page rule at the END of styles
      pageStyles += '\n@page { margin: 0.5in 0.6in; size: letter; }';

      // Ensure @media print preserves padding
      if (!/@media\s+print/i.test(pageStyles)) {
        pageStyles += '\n@media print { body { padding: 0.5in 0.6in !important; } }';
      } else {
        pageStyles = pageStyles.replace(
          /@media\s+print\s*{([^}]*)}/gi,
          '@media print { body { padding: 0.5in 0.6in !important; } }'
        );
      }

      designHtml = designHtml.replace(
        /<style[^>]*>[\s\S]*?<\/style>/i,
        `<style>${pageStyles}</style>`
      );
      console.log('[Design] ✓ Print margins fixed: @page { margin: 0.5in 0.6in; }');
    }

    // Validate contrast ratios (WCAG AA compliance)
    console.log('[Design] Validating contrast ratios...');
    const contrastValidation = validateResumeContrast(designHtml);

    if (!contrastValidation.passed) {
      console.warn('[Design] Contrast validation failed:', contrastValidation.summary);
      const failedChecks = contrastValidation.results.filter(r => !r.meetsAA);
      failedChecks.forEach(check => {
        console.warn(`  - ${check.context}: ${check.contrastRatio.toFixed(2)}:1 (needs 4.5:1)`);
      });
      console.warn('[Design] Design has poor contrast but proceeding anyway');
    } else {
      console.log('[Design] ✓ Contrast validation passed!', contrastValidation.summary);
    }

    // Update resume with design
    await sql`
      UPDATE resumes SET
        improved_html = ${designHtml},
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;

    console.log(`[Design] Resume ${resumeId} updated with HTML design`);

    // Save template to database
    if (design.templateName) {
      try {
        // Make template name unique by appending resume ID (first 8 chars)
        const uniqueTemplateName = `${design.templateName} (${resumeId.substring(0, 8)})`;

        await sql`
          INSERT INTO resume_templates (
            name,
            style,
            color_scheme,
            html_template,
            preview_image_url,
            is_ai_generated,
            usage_count,
            created_from_resume_id
          ) VALUES (
            ${uniqueTemplateName},
            ${design.style || 'modern'},
            ${design.colorScheme || 'blue'},
            ${designHtml},
            ${null},
            ${true},
            ${0},
            ${resumeId}
          )
          ON CONFLICT (name) DO NOTHING
        `;
        console.log(`[Template] Successfully saved template: ${uniqueTemplateName}`);
      } catch (templateErr) {
        console.error(`[Template] Failed to save template:`, templateErr);
      }
    }

    return { success: true, html: designHtml };
  } catch (error) {
    console.error(`[Design] Error generating design for resume:`, error);
    throw error;
  }
}

export default processResume;
