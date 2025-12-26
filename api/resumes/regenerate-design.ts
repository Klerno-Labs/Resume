import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import { getRandomTemplate } from '../lib/designTemplates.js';

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

    // Generate new design with random template
    const template = getRandomTemplate();
    const openai = getOpenAI();

    console.log('[Regenerate Design] Using template:', template.name);

    const designResult = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an elite resume designer with expertise in modern web design, typography, and professional branding. Create stunning, magazine-quality resume designs that stand out while maintaining ATS compatibility. Use contemporary design trends: geometric shapes, gradients, whitespace mastery, and sophisticated color palettes. Think Behance, Dribbble quality. Always output valid JSON.`,
        },
        {
          role: 'user',
          content: `Design a STUNNING professional resume in HTML/CSS using this EXACT design template specification.

Resume content:
${resume.improved_text || resume.original_text}

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
    });

    const design = JSON.parse(designResult.choices[0].message.content || '{}');

    if (!design.html) {
      return res.status(500).json({ error: 'Failed to generate design' });
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
    });
  } catch (error) {
    console.error('[Regenerate Design] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
