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
${originalText.substring(0, 1500)}

DESIGN REQUIREMENTS:

1. LAYOUT & STRUCTURE (CRITICAL - MUST USE 2-COLUMN):
   - MUST use 2-column layout: colored sidebar (35%) + main content (65%)
   - CSS Grid: display: grid; grid-template-columns: 280px 1fr;
   - SIDEBAR (left): Colored background with gradient, contains contact, skills, education
   - MAIN (right): White background, contains summary and experience
   - Sidebar text: white or very light colors
   - Photo circle or icon at top of sidebar
   - Full-height sidebar with gradient background

2. TYPOGRAPHY (CRITICAL):
   - Google Fonts CDN: Poppins, Inter, Montserrat, or Roboto
   - Name: 28-36px, font-weight: 700, in sidebar (white text)
   - Job title: 14-16px, in sidebar below name
   - Section headers: 18-22px, uppercase, letter-spacing: 2px
   - Body text: 11px, line-height: 1.7
   - Sidebar section headers: smaller, white, uppercase

3. COLOR & VISUAL DESIGN (CRITICAL - SIDEBAR FOCUS):
   - Sidebar background: LINEAR GRADIENT of accent color
   - Examples: linear-gradient(135deg, #667eea 0%, #764ba2 100%) for purple
   - linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%) for blue
   - linear-gradient(135deg, #10b981 0%, #059669 100%) for green
   - Sidebar ALL text: white (#ffffff)
   - Main area: white background, dark text (#2c3e50)
   - Headers in main area: accent color matching sidebar

4. VISUAL ELEMENTS (MAKE IT POP):
   - Circular photo placeholder: 120px circle, border: 4px solid white, in sidebar
   - Contact icons: 📧 ☎ 🌐 📍 (white, in sidebar)
   - Skill tags: white pills with semi-transparent background in sidebar
   - Divider lines in sidebar: 1px solid rgba(255,255,255,0.3)
   - Box-shadow on entire container: 0 10px 30px rgba(0,0,0,0.15)
   - Clean professional look like TopTierResumes or BeamJobs templates

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
        max_tokens: 3000,  // Reduced from 4000 for faster generation
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

    // Save template in background (non-blocking) - don't await
    if (design.html && design.templateName) {
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
