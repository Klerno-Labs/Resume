import OpenAI from 'openai';
import { getSQL } from './db.js';

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
    const [optimizationResult, scoreResult, designResult] = await Promise.all([
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
${originalText}

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
${originalText.substring(0, 1500)}

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
        max_tokens: 800,
      }),
      // AI-generated HTML design
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an elite resume designer with expertise in modern web design, typography, and professional branding. Create stunning, magazine-quality resume designs that stand out while maintaining ATS compatibility. Use contemporary design trends: geometric shapes, gradients, whitespace mastery, and sophisticated color palettes. Think Behance, Dribbble quality. Always output valid JSON.`
          },
          {
            role: 'user',
            content: `Design a STUNNING professional resume in HTML/CSS that looks like it was created by a top design agency.

Resume content:
${originalText.substring(0, 2000)}

DESIGN REQUIREMENTS:

1. LAYOUT & STRUCTURE:
   - Use CSS Grid or Flexbox for sophisticated layouts
   - Consider 2-column layouts, sidebar designs, or asymmetric grids
   - Add a header section with name prominently displayed
   - Use cards or panels to group information
   - Generous whitespace (padding: 20-40px where appropriate)

2. TYPOGRAPHY (CRITICAL):
   - Use Google Fonts or web-safe font stacks
   - Name: 32-48px, bold, striking
   - Section headers: 20-24px, uppercase or small-caps
   - Body text: 11-12px, line-height: 1.6-1.8
   - Mix font weights (300, 400, 600, 700)
   - Letter-spacing for headers (1-2px)

3. COLOR & VISUAL DESIGN:
   - Choose ONE accent color (vibrant but professional)
   - Use color for: headers, borders, icons, backgrounds
   - Add subtle gradients or color overlays
   - Background: white or very light gray (#f8f9fa)
   - Text: dark gray (#2c3e50) not pure black
   - Include a colored header bar or sidebar

4. VISUAL ELEMENTS:
   - Add thin borders or dividing lines (1-3px)
   - Use box-shadows for depth (subtle: 0 2px 4px rgba(0,0,0,0.1))
   - Include geometric shapes (circles, rectangles, lines)
   - Consider icons for contact info (using Unicode symbols)
   - Add background patterns or textures (very subtle)

5. SECTIONS:
   - Clear visual separation between sections
   - Use different backgrounds for alternating sections
   - Add subtle borders or divider lines
   - Highlight key achievements with different styling

6. PRINT OPTIMIZATION:
   - Page size: 8.5" × 11" (max-width: 800px)
   - Margins: 0.5-1 inch
   - Use @page CSS for print styles
   - Ensure colors print well (not too light)

7. MUST INCLUDE:
   - Complete <!DOCTYPE html> declaration
   - All CSS inline in <style> tag
   - Semantic HTML (header, section, h1-h6)
   - Professional color scheme
   - Modern, eye-catching design
   - NO external resources (fonts can use Google Fonts CDN)

Make it look EXPENSIVE and PROFESSIONAL. Think Apple, Nike, or tech startup aesthetics.

Return ONLY valid JSON:
{
  "html": "<!DOCTYPE html><html>...complete HTML with inline CSS...</html>",
  "templateName": "Creative Professional Blue Gradient",
  "style": "modern|classic|creative|minimal",
  "colorScheme": "primary accent color"
}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
      }),
    ]);

    const optimization = JSON.parse(optimizationResult.choices[0].message.content || '{}');
    const scores = JSON.parse(scoreResult.choices[0].message.content || '{}');
    const design = JSON.parse(designResult.choices[0].message.content || '{}');

    // Update resume with improvements and design
    await sql`
      UPDATE resumes SET
        improved_text = ${optimization.improvedText || originalText},
        improved_html = ${design.html || null},
        ats_score = ${scores.atsScore || 70},
        keywords_score = ${scores.keywordsScore || 7},
        formatting_score = ${scores.formattingScore || 7},
        issues = ${JSON.stringify(scores.issues || [])},
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;

    // Save the generated design as a reusable template for others
    if (design.html && design.templateName) {
      try {
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
        `;
        console.log(`[Template] Saved new template: ${design.templateName}`);
      } catch (templateError) {
        console.warn('[Template] Failed to save template:', templateError);
        // Don't fail the whole resume process if template saving fails
      }
    }
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
