import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import { getAllTemplates } from '../lib/designTemplates.js';
import { validateResumeContrast } from '../lib/contrastValidator.js';

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

/**
 * Generate 3 design previews for user to choose from
 * POST /api/resumes/preview-designs
 */
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

    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    const sql = getSQL();

    // Get resume
    const resumes = await sql`SELECT * FROM resumes WHERE id = ${resumeId} AND user_id = ${user.id}` as any[];

    if (!resumes || resumes.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = resumes[0];

    console.log('[Preview Designs] Generating 3 design options for resume:', resumeId);

    // Get all templates and select 3 diverse ones
    const allTemplates = await getAllTemplates();

    // Select 3 templates with different layouts
    const selectedTemplates = [];
    const usedLayouts = new Set<string>();

    for (const template of allTemplates) {
      if (selectedTemplates.length >= 3) break;
      if (!usedLayouts.has(template.layout)) {
        selectedTemplates.push(template);
        usedLayouts.add(template.layout);
      }
    }

    // If we don't have 3 yet, add random ones
    while (selectedTemplates.length < 3 && selectedTemplates.length < allTemplates.length) {
      const randomTemplate = allTemplates[Math.floor(Math.random() * allTemplates.length)];
      if (!selectedTemplates.includes(randomTemplate)) {
        selectedTemplates.push(randomTemplate);
      }
    }

    console.log('[Preview Designs] Selected templates:', selectedTemplates.map(t => `${t.name} (${t.layout})`));

    const openai = getOpenAI();
    const previews = [];

    // Generate designs in parallel with retry logic
    const designPromises = selectedTemplates.map(async (template) => {
      console.log('[Preview Designs] Generating design with template:', template.name);

      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[Preview Designs] Attempt ${attempt}/${maxRetries} for template:`, template.name);

        const designResult = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional resume designer. Create clean, minimal, ATS-friendly 2-page resumes.

STRICT COLOR RULES:
1. Background: ONLY white (#FFFFFF)
2. Main text: ONLY dark gray (#2d2d2d) or black (#000000)
3. Accent color: Use ${template.accentColor} SPARINGLY - only for name and thin section dividers
4. NO other colors, NO backgrounds, NO decorations

FORMATTING:
- Standard US Letter: 8.5" x 11" (595px x 842px per page)
- Two pages stacked vertically (page 1 on top, page 2 below)
- Total height: auto (let content flow naturally)
- Margins: 0.75 inch all sides
- Fonts: ${template.fonts[0]} at 10-11pt body, 12pt headers, 18pt name
- Line height: 1.5 for readability

CONTENT:
- Include ALL resume content across both pages
- Distribute naturally: don't force page breaks mid-section
- Page 1: Header, Summary, Start of Experience
- Page 2: Rest of Experience, Education, Skills

OUTPUT: {"html": "<!DOCTYPE html>..."}`,
            },
            {
              role: 'user',
              content: `Create a simple 2-page resume with this content:

${resume.improved_text || resume.original_text}

RULES:
- White background only
- ${template.accentColor} for name and thin lines ONLY
- Black/dark gray text only
- Two pages stacked vertically
- Clean, minimal, professional
- Include ALL content

Return JSON: {"html": "<!DOCTYPE html>..."}`,
            },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 8000,
        });

        let design;
        try {
          const content = designResult.choices[0].message.content || '{}';
          design = JSON.parse(content);
        } catch (parseError) {
          console.error(`[Preview] Attempt ${attempt}: JSON parse error for template:`, template.name);
          if (attempt === maxRetries) return null;
          continue; // Retry on parse error
        }

        if (!design.html) {
          console.error(`[Preview] Attempt ${attempt}: No HTML generated for template:`, template.name);
          if (attempt === maxRetries) return null;
          continue; // Retry if no HTML
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
