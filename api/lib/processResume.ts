import OpenAI from 'openai';
import { getSQL } from './db.js';
import { getRandomTemplate } from './designTemplates.js';

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
    const sql = getSQL();
    const openai = getOpenAI();

    // Get a random unique design template
    const template = getRandomTemplate();

    // Run optimization and scoring in parallel (fast)
    // Design generation happens after in background to avoid timeout
    const [optimizationResult, scoreResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume writer and career coach. Your task is to transform resumes into ATS-optimized, professional documents that highlight achievements and use strong action verbs. Always output valid JSON with an "improvedText" field containing the complete rewritten resume.'
          },
          {
            role: 'user',
            content: `Rewrite this resume to make it more professional and ATS-friendly. Follow these guidelines:

1. Use strong action verbs (Led, Managed, Achieved, Spearheaded, etc.)
2. Quantify achievements with numbers, percentages, or metrics
3. Remove weak language like "some", "most of the time", "still learning"
4. Make bullet points concise and impact-focused
5. Improve formatting and structure
6. Maintain all contact information and dates exactly as provided
7. Keep the same overall length and sections

Resume to improve:
${originalText.substring(0, 3000)}

Return ONLY valid JSON in this exact format:
{"improvedText": "the complete improved resume text here"}`,
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
            content: 'You are an ATS (Applicant Tracking System) expert and resume evaluator. Analyze resumes and provide detailed scores and actionable feedback. Always output valid JSON.'
          },
          {
            role: 'user',
            content: `Analyze this resume and provide scores and specific issues:

Resume:
${originalText.substring(0, 1200)}

Evaluate:
1. ATS Score (0-100): How well would this pass automated screening systems?
   - Consider: keywords, formatting, structure, quantifiable achievements
2. Keywords Score (0-10): Presence of relevant industry keywords and action verbs
3. Formatting Score (0-10): Professional structure, consistency, readability
4. Issues: Specific problems to fix (weak verbs, missing metrics, formatting issues, etc.)

Return ONLY valid JSON in this exact format:
{
  "atsScore": 85,
  "keywordsScore": 7,
  "formattingScore": 8,
  "issues": [
    {"type": "weak-language", "message": "Replace 'some experience' with specific metrics", "severity": "high"},
    {"type": "missing-achievement", "message": "Add quantifiable results to work experience", "severity": "medium"}
  ]
}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,  // Reduced from 800
      }),
    ]);

    const optimization = JSON.parse(optimizationResult.choices[0].message.content || '{}');
    const scores = JSON.parse(scoreResult.choices[0].message.content || '{}');

    // Update resume with text improvements FIRST (fast response)
    await sql`
      UPDATE resumes SET
        improved_text = ${optimization.improvedText || originalText},
        ats_score = ${scores.atsScore || 70},
        keywords_score = ${scores.keywordsScore || 7},
        formatting_score = ${scores.formattingScore || 7},
        issues = ${JSON.stringify(scores.issues || [])},
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;

    // Generate design in background (don't await to avoid timeout)
    console.log('[Process] Starting background design generation...');
    openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an elite resume designer with expertise in modern web design, typography, and professional branding. Create stunning, magazine-quality resume designs that stand out while maintaining ATS compatibility. Use contemporary design trends: geometric shapes, gradients, whitespace mastery, and sophisticated color palettes. Think Behance, Dribbble quality. Always output valid JSON.`
          },
          {
            role: 'user',
            content: `Design a STUNNING professional resume in HTML/CSS using this EXACT design template specification.

Resume content:
${originalText.substring(0, 1500)}

DESIGN TEMPLATE TO USE:
Template Name: ${template.name}
Style: ${template.style}
Gradient: ${template.gradient}
Accent Color: ${template.accentColor}
Fonts: ${template.fonts[0]} (headers), ${template.fonts[1]} (body)
Description: ${template.description}

CRITICAL DESIGN REQUIREMENTS:

1. LAYOUT & STRUCTURE (MUST USE 2-COLUMN):
   - MUST use 2-column layout: colored sidebar (35%) + main content (65%)
   - CSS Grid: display: grid; grid-template-columns: 280px 1fr;
   - SIDEBAR (left): Use gradient "${template.gradient}"
   - MAIN (right): White background, contains summary and experience
   - Sidebar text: white (#ffffff)
   - Photo circle at top of sidebar: 120px, white border
   - Full-height sidebar with gradient background

2. TYPOGRAPHY (EXACT FONTS):
   - Google Fonts CDN: "${template.fonts[0]}" and "${template.fonts[1]}"
   - Name: 28-36px, font-weight: 700, font-family: '${template.fonts[0]}', in sidebar (white)
   - Job title: 14-16px, font-family: '${template.fonts[1]}', in sidebar below name
   - Section headers: 18-22px, uppercase, letter-spacing: 2px, font-family: '${template.fonts[0]}'
   - Body text: 11px, line-height: 1.7, font-family: '${template.fonts[1]}'
   - Sidebar section headers: smaller, white, uppercase, font-family: '${template.fonts[0]}'

3. COLOR & VISUAL DESIGN (USE EXACT COLORS):
   - Sidebar background: ${template.gradient}
   - Accent color for headers in main area: ${template.accentColor}
   - Sidebar ALL text: white (#ffffff)
   - Main area: white background (#ffffff), dark text (#2c3e50)
   - Section headers in main: ${template.accentColor}
   - Links and highlights: ${template.accentColor}

4. VISUAL ELEMENTS (MAKE IT UNIQUE):
   - NO photo placeholder - leave space or use decorative element instead
   - Contact icons: Email, Phone, Location, Website (use simple white icons or text in sidebar)
   - Skill tags: white pills with background: rgba(255,255,255,0.2) in sidebar
   - Divider lines in sidebar: 1px solid rgba(255,255,255,0.3)
   - Box-shadow on container: 0 10px 30px rgba(0,0,0,0.15)
   - Add unique decorative elements based on style: ${template.style}

5. STYLE-SPECIFIC VARIATIONS:
   ${template.style === 'modern' ? '- Use clean lines, bold typography, geometric shapes' : ''}
   ${template.style === 'classic' ? '- Use serif fonts, traditional spacing, elegant borders' : ''}
   ${template.style === 'creative' ? '- Use bold colors, creative layouts, unique shapes' : ''}
   ${template.style === 'minimal' ? '- Use maximum whitespace, simple lines, restrained design' : ''}

6. PRINT OPTIMIZATION:
   - Page size: 8.5" × 11" (max-width: 800px)
   - Margins: 0.5-1 inch
   - Use @page CSS for print styles

7. MUST INCLUDE:
   - Complete <!DOCTYPE html> declaration
   - All CSS inline in <style> tag
   - Semantic HTML
   - Google Fonts link for: ${template.fonts.join(' and ')}

Make this design UNIQUE from other resumes. Use the specified gradient and fonts to create a distinct visual identity.

Return ONLY valid JSON:
{
  "html": "<!DOCTYPE html><html>...complete HTML with inline CSS...</html>",
  "templateName": "${template.name}",
  "style": "${template.style}",
  "colorScheme": "${template.accentColor}"
}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 3000,
      }).then(async (designResult) => {
        // Process design result in background
        const design = JSON.parse(designResult.choices[0].message.content || '{}');

        if (design.html) {
          console.log('[Process] Design generated, updating resume...');
          await sql`
            UPDATE resumes SET
              improved_html = ${design.html},
              updated_at = NOW()
            WHERE id = ${resumeId}
          `;

          // Save template in background
          if (design.templateName) {
            sql`
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
                ${design.templateName},
                ${design.style || 'modern'},
                ${design.colorScheme || 'blue'},
                ${design.html},
                ${null},
                ${true},
                ${0},
                ${resumeId}
              )
              ON CONFLICT (name) DO UPDATE SET
                usage_count = resume_templates.usage_count + 1,
                updated_at = NOW()
            `.then(() => {
              console.log(`[Template] Saved new template: ${design.templateName}`);
            }).catch(err => {
              console.warn('[Template] Failed to save template:', err);
            });
          }
        }
      }).catch(err => {
        console.error('[Process] Background design generation failed:', err);
        // Design failure doesn't fail the whole resume
      });
  } catch (error) {
    console.error('[Process] Error optimizing resume:', error);
    const sql = getSQL();
    await sql`UPDATE resumes SET status = 'failed' WHERE id = ${resumeId}`;

    if (userPlan !== 'admin') {
      await sql`UPDATE users SET credits_remaining = credits_remaining + 1 WHERE id = ${userId}`;
      console.log(`[Credit] Refunded 1 credit to user ${userId} due to optimization failure`);
    }
  }
}

export default processResume;
