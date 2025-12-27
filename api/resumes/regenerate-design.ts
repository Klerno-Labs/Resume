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
          content: `You are a minimalist resume designer creating expensive-looking resumes for 2025. Your designs are EXTREMELY MINIMAL, clean, and typographically disciplined. Key principles: (1) Maximum white space - nothing cramped, generous margins (0.5-1 inch), consistent vertical rhythm, (2) ONE professional font only (Lato, Calibri, or Georgia) at 10-11pt body, 11-12pt headers, 14-18pt name, (3) ONE subtle accent color for structure only (navy, deep green, or burgundy), (4) Perfect alignment and pixel-precise spacing consistency, (5) NO icons, NO photos, NO graphics, NO decorative elements, (6) Looks like a premium business document first, designed object second. Think: minimalist luxury, Swiss design, NOT Canva templates. Always output valid JSON.`,
        },
        {
          role: 'user',
          content: `Create an EXTREMELY MINIMAL, CLEAN resume design in HTML/CSS that looks like an expensive 2025 business document - NOT a Canva template.

Resume content:
${resume.improved_text || resume.original_text}

TEMPLATE SPECIFICATION:
Name: ${template.name}
Style: ${template.style}
Layout Type: ${template.layout}
Gradient: ${template.gradient}
Accent: ${template.accentColor}
Fonts: ${template.fonts[0]} (headers), ${template.fonts[1]} (body)

🎨 MINIMALIST DESIGN REQUIREMENTS (CRITICAL - MAXIMUM WHITE SPACE, ZERO CLUTTER):

1. LAYOUT - ${template.layout.toUpperCase()} STRUCTURE:
${template.layout === '2-column' ? `   ✓ Grid: display: grid; grid-template-columns: 280px 1fr; height: 842px;
   ✓ SIDEBAR (280px): Gradient background ${template.gradient}, full height, elegant padding (30px)
   ✓ MAIN (remaining): Pure white (#ffffff), generous margins (40px), professional spacing
   ✓ Name at TOP of sidebar: Large (32px), bold (700), ${template.fonts[0]}, white, letter-spacing: 1px
   ✓ Job title below name: 13px, ${template.fonts[1]}, white, opacity: 0.95, elegant spacing
   ✓ NO photo - use elegant monogram circle instead: 80px circle with initials, subtle border` : ''}${template.layout === 'single-column' ? `   ✓ Container: max-width: 500px, centered, height: 842px
   ✓ Name: Large (36px), bold, ${template.fonts[0]}, color: ${template.accentColor}, centered, letter-spacing: 1px
   ✓ Job title: 16px, ${template.fonts[1]}, centered below name, margin: 8px 0
   ✓ Contact info: Horizontal row beneath title, 10px, separated by bullets (•)
   ✓ Sections: Full-width blocks with generous spacing (32px between), left-aligned content
   ✓ Headers: Centered or left-aligned, 16px, uppercase, ${template.accentColor}, underline or bottom border` : ''}${template.layout === 'timeline' ? `   ✓ Container: max-width: 550px, centered, height: 842px
   ✓ Header: Name (36px), title (14px), contact - all centered at top
   ✓ Timeline: Vertical line on left (3px solid ${template.accentColor}), connecting experience items
   ✓ Timeline dots: 16px circles on the line at each job, filled with ${template.accentColor}
   ✓ Experience cards: Offset from timeline (margin-left: 40px), with date badges
   ✓ Dates: Small badges (10px) positioned on timeline, background ${template.accentColor}, white text
   ✓ Visual flow: Connecting lines between timeline dots create career progression visualization` : ''}${template.layout === 'skills-first' ? `   ✓ Container: max-width: 595px, height: 842px
   ✓ Header: Name (34px) and title (14px) at top, ${template.accentColor}
   ✓ Skills Section: Immediately below header, prominent placement (top 25% of page)
   ✓ Skills Display: Grid of pills (3-4 columns), padding: 8px 16px, background: ${template.accentColor}15, border: 1px solid ${template.accentColor}50
   ✓ OR Skill bars: Horizontal bars showing proficiency, filled portion ${template.accentColor}
   ✓ Experience: Standard format below skills, condensed to fit remaining space
   ✓ Visual hierarchy: Skills visually dominant, larger and more colorful than experience` : ''}${template.layout === 'split-column' ? `   ✓ Grid: display: grid; grid-template-columns: 1fr 1fr; gap: 30px; height: 842px
   ✓ Header: Spans both columns, name (32px) and title (13px), ${template.accentColor}
   ✓ Left column: Experience (chronological work history)
   ✓ Right column: Skills, Education, Certifications
   ✓ Equal weight: Both columns same width (50/50), balanced visual importance
   ✓ Divider: Optional subtle vertical line between columns (1px, #e5e7eb)
   ✓ Symmetry: Matching spacing and alignment in both columns` : ''}${template.layout === 'header-banner' ? `   ✓ Banner: Full-width header (height: 180px), gradient ${template.gradient}, contains name and contact
   ✓ Name in banner: 36px, bold, white, ${template.fonts[0]}, centered or left-aligned with padding
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

4. SPACING & WHITESPACE - MAXIMUM WHITE SPACE (CRITICAL):
   ✓ Page Margins: 0.5-1 inch (36-72px) on all sides - generous breathing room
   ✓ Section Spacing: 24-32px between major sections (NEVER cramped, NEVER crowded)
   ✓ Line Height: 1.5-1.6 for body text (excellent readability)
   ✓ Paragraph Spacing: 8-12px between bullet points, 16-20px between job entries
   ✓ Vertical Rhythm: Consistent spacing grid (8px, 12px, 16px, 24px, 32px)
   ✓ Letter Spacing: 0-0.5px MAX (no excessive tracking - looks amateur)
   ✓ White space is a FEATURE, not wasted space - embrace emptiness

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

9. EXAMPLES OF MINIMAL STRUCTURE (Study these):
   ✓ Name Section: Name (18-24px, bold, letter-spacing: 0px) → Title (15px, regular, margin-top: 4px) → Contact (plain text: email | phone | location, 13px)
   ✓ Experience Entry: Company (13px, ${template.accentColor} OR #1a1a1a, semibold) | Job Title (13px, #1a1a1a, semibold) | Dates (13px, #666666, regular, right-aligned) → Standard • bullets
   ✓ Skills Section: Simple comma-separated list OR minimal boxes: padding: 4px 8px, background: #f5f5f5, border: none, font-size: 13px, color: #1a1a1a
   ✓ Section Header: Text (15px, uppercase OR sentence case, letter-spacing: 0px, ${template.accentColor} OR #1a1a1a) + 1px bottom border + 12px margin-bottom

💎 FINAL QUALITY CHECK - DOES IT LOOK LIKE AN EXPENSIVE 2025 MINIMAL RESUME?
   ✓ Typography: ONE font only, perfect hierarchy through size/weight, NO excessive letter-spacing
   ✓ Color: ONE accent color used sparingly, mostly black/gray text on white
   ✓ Whitespace: MAXIMUM white space, generous margins (0.5-1 inch), consistent vertical rhythm
   ✓ Zero Clutter: NO icons, NO photos, NO monograms, NO decorative elements, NO shadows
   ✓ Overall: Looks like a premium business document, NOT a Canva template. Clean, minimal, expensive.

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
