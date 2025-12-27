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

    // Generate new design with random template (now async!)
    const template = await getRandomTemplate();
    const openai = getOpenAI();

    console.log('[Regenerate Design] Using template:', template.name);

    const designResult = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an award-winning resume designer from top design agencies (Pentagram, IDEO, Frog). Your resumes are featured in design galleries and win clients Fortune 500 interviews. Create PROFESSIONAL, POLISHED, EXECUTIVE-LEVEL resume designs that look like they cost $500 from a premium design studio. Use sophisticated typography, perfect spacing, elegant visual hierarchy, and refined color usage. Think: LinkedIn ProFinder top 1%, Canva Pro quality, Behance featured work. Always output valid JSON.`,
        },
        {
          role: 'user',
          content: `Create a PROFESSIONAL, POLISHED resume design in HTML/CSS that looks EXPENSIVE and SOPHISTICATED - like it was designed by a top-tier design agency.

Resume content:
${resume.improved_text || resume.original_text}

TEMPLATE SPECIFICATION:
Name: ${template.name}
Style: ${template.style}
Gradient: ${template.gradient}
Accent: ${template.accentColor}
Fonts: ${template.fonts[0]} (headers), ${template.fonts[1]} (body)

🎨 PROFESSIONAL DESIGN REQUIREMENTS (CRITICAL - MAKE IT LOOK EXPENSIVE):

1. LAYOUT - SOPHISTICATED 2-COLUMN DESIGN:
   ✓ Grid: display: grid; grid-template-columns: 280px 1fr; height: 842px;
   ✓ SIDEBAR (280px): Gradient background ${template.gradient}, full height, elegant padding (30px)
   ✓ MAIN (remaining): Pure white (#ffffff), generous margins (40px), professional spacing
   ✓ Name at TOP of sidebar: Large (32px), bold (700), ${template.fonts[0]}, white, letter-spacing: 1px
   ✓ Job title below name: 13px, ${template.fonts[1]}, white, opacity: 0.95, elegant spacing
   ✓ NO photo - use elegant monogram circle instead: 80px circle with initials, subtle border

2. TYPOGRAPHY - EXECUTIVE-LEVEL REFINEMENT:
   ✓ Load Google Fonts: <link href="https://fonts.googleapis.com/css2?family=${template.fonts[0].replace(/ /g, '+')}:wght@300;400;600;700&family=${template.fonts[1].replace(/ /g, '+')}:wght@300;400;500;600&display=swap">
   ✓ Name: 32px, font-weight: 700, ${template.fonts[0]}, white, letter-spacing: 1px, line-height: 1.2
   ✓ Job Title: 13px, font-weight: 400, ${template.fonts[1]}, white, margin-top: 8px
   ✓ Section Headers (main): 14px, font-weight: 600, ${template.fonts[0]}, ${template.accentColor}, uppercase, letter-spacing: 2.5px, margin-bottom: 16px, border-bottom: 2px solid ${template.accentColor}, padding-bottom: 8px
   ✓ Body Text: 10px, font-weight: 400, ${template.fonts[1]}, #2c3e50, line-height: 1.6, perfect kerning
   ✓ Sidebar Headers: 11px, font-weight: 600, ${template.fonts[0]}, white, uppercase, letter-spacing: 1.5px, margin: 24px 0 12px
   ✓ Dates/Meta: 9px, font-weight: 500, #64748b, italic, spacing: 4px

3. COLOR PALETTE - REFINED & COHESIVE:
   ✓ Sidebar: ${template.gradient} (rich, saturated, professional)
   ✓ Main Headers: ${template.accentColor} (vibrant but sophisticated)
   ✓ Body Text: #2c3e50 (deep charcoal, not pure black - easier on eyes)
   ✓ Secondary Text: #64748b (elegant gray for dates/meta)
   ✓ Sidebar Text: #ffffff with subtle opacity variations (1.0 for name, 0.95 for details, 0.9 for labels)
   ✓ Skill Pills: background rgba(255,255,255,0.25), border: 1px solid rgba(255,255,255,0.3), padding: 6px 12px, border-radius: 20px

4. SPACING & WHITESPACE - BREATHING ROOM:
   ✓ Section Margins: 28px between sections (never cramped!)
   ✓ Sidebar Padding: 30px all sides (luxurious feel)
   ✓ Main Content Padding: 40px top, 45px right, 40px bottom, 40px left
   ✓ Paragraph Spacing: 12px between bullet points, 20px between jobs
   ✓ Line Height: Body 1.6, Headers 1.3 (perfect readability)
   ✓ Letter Spacing: Headers +2.5px, Name +1px (premium look)

5. VISUAL POLISH - DETAILS THAT MATTER:
   ✓ Subtle shadow on container: box-shadow: 0 4px 24px rgba(0,0,0,0.08);
   ✓ Elegant dividers in sidebar: border-top: 1px solid rgba(255,255,255,0.2), margin: 20px 0
   ✓ Skill tags: Use CSS pills with hover effect, rounded corners (20px), subtle shadows
   ✓ Job titles: font-weight: 600, font-size: 11px, color: #1e293b, margin-bottom: 4px
   ✓ Company names: font-weight: 500, font-size: 10px, color: ${template.accentColor}, margin-bottom: 6px
   ✓ Bullet points: Custom styled (▸ or elegant • with ${template.accentColor}), proper indentation (20px)
   ✓ Contact info: Icon-like symbols (📧 ☎ 📍 🌐) or elegant Unicode, spacing: 10px between items

6. PROFESSIONAL TOUCHES - WHAT SETS IT APART:
   ✓ Monogram circle: 80px circle at top of sidebar, white border (3px), background rgba(255,255,255,0.15), centered initials (24px, bold)
   ✓ Subtle texture: Add very subtle pattern/noise to sidebar for depth (optional: repeating-linear-gradient)
   ✓ Print-friendly: All measurements in px, @page { margin: 0; size: letter; }
   ✓ Modern bullet style: Use elegant shapes (▸ or custom SVG-like), colored with accent
   ✓ Hierarchy: Clear visual weight - Name > Section Headers > Job Titles > Body
   ✓ Consistency: All spacing follows 4px grid (4, 8, 12, 16, 20, 24, etc.)

7. SINGLE-PAGE CONSTRAINT (CRITICAL):
   ✓ Container: width: 595px, height: 842px (exact US Letter), overflow: hidden
   ✓ Font sizes: Precisely calculated - Name 32px, Headers 14px, Body 10px, Meta 9px
   ✓ Strategic spacing: Use all sizing values given above - they're calculated to fit perfectly
   ✓ If too long: Reduce bullet points to 2-3 per job, shorten summary, prioritize recent experience
   ✓ CSS: html, body { overflow: hidden !important; height: 842px !important; margin: 0; }

8. CODE STRUCTURE - CLEAN & SEMANTIC:
   ✓ DOCTYPE: <!DOCTYPE html>
   ✓ Full Google Fonts link with multiple weights
   ✓ ALL CSS in <style> tag (no external files)
   ✓ Semantic HTML5: <header>, <section>, <article>, <aside>
   ✓ Print CSS: @page { margin: 0; size: letter; } @media print { .container { box-shadow: none !important; } }

9. EXAMPLES OF PROFESSIONAL POLISH (Study these):
   ✓ Name Section: Monogram circle (80px) → Name (32px, bold, letter-spacing: 1px) → Title (13px, opacity: 0.95, margin-top: 8px) → Contact (10px icons, spacing: 10px)
   ✓ Experience Entry: Company (10px, ${template.accentColor}, bold) | Job Title (11px, #1e293b, semibold) | Dates (9px, italic, #64748b) → Bullets with custom ▸ markers
   ✓ Skills Section: Pill-style tags, each: padding: 6px 12px, border-radius: 20px, background: rgba(255,255,255,0.25), margin: 4px
   ✓ Section Header: Text (14px, uppercase, letter-spacing: 2.5px, ${template.accentColor}) + 2px bottom border + 16px margin-bottom

💎 FINAL QUALITY CHECK - DOES IT LOOK LIKE A $500 PREMIUM RESUME?
   ✓ Typography: Perfect hierarchy, elegant spacing, professional fonts
   ✓ Color: Cohesive palette, not garish, sophisticated gradients
   ✓ Whitespace: Generous but efficient, never cramped
   ✓ Details: Monogram, custom bullets, pill tags, elegant dividers
   ✓ Overall: Could this be on Behance? Would a Fortune 500 recruiter be impressed?

Return ONLY valid JSON (no markdown, no explanations):
{
  "html": "<!DOCTYPE html><html>...complete polished HTML...</html>",
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
