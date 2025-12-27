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

    // Generate designs in parallel
    const designPromises = selectedTemplates.map(async (template) => {
      console.log('[Preview Designs] Generating design with template:', template.name);

      const designResult = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a strict HTML template filler. You ONLY use the EXACT colors provided. You NEVER invent new colors. You create minimal, professional 2025 resumes that look expensive.

STRICT RULES:
1. Use ONLY the provided accent color - NO random colors, NO pink, NO bright colors
2. Use ONLY white (#FFFFFF) backgrounds and dark text (#1a1a1a or #2d2d2d)
3. Font: ${template.fonts[0]} ONLY at 10-11pt body, 12pt headers, 16-18pt name
4. Margins: 0.75-1 inch on all sides - GENEROUS white space
5. NO decorative elements, NO icons, NO graphics, NO borders except minimal hairline dividers
6. Clean, minimal, professional business document style

OUTPUT FORMAT: {"html": "<!DOCTYPE html>...complete HTML..."}`,
          },
          {
            role: 'user',
            content: `Create a MINIMAL professional resume using this EXACT template style:

Layout: ${template.layout}
Accent Color: ${template.accentColor} (USE THIS COLOR EXACTLY - for section headers and subtle accents ONLY)
Font: ${template.fonts[0]}

Resume Content:
${resume.improved_text || resume.original_text}

CRITICAL RULES:
- Accent color (${template.accentColor}) ONLY for: section headers, thin divider lines, name color
- Background: white (#FFFFFF) ONLY
- Body text: dark gray (#2d2d2d)
- NO other colors allowed
- Maximum white space, clean minimal layout
- Return ONLY valid JSON: {"html": "<!DOCTYPE html>..."}`,
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
        console.error('[Preview] JSON parse error for template:', template.name);
        return null;
      }

      if (!design.html) {
        console.error('[Preview] No HTML generated for template:', template.name);
        return null;
      }

      // Validate contrast
      const contrastValidation = validateResumeContrast(design.html);

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
        console.warn('[Preview] AI used unauthorized colors:', unauthorizedColors, 'for template:', template.name);
        console.warn('[Preview] Rejecting this design - will be filtered out');
        return null; // Reject designs with wrong colors
      }

      return {
        templateName: template.name,
        templateStyle: template.style,
        layout: template.layout,
        accentColor: template.accentColor,
        html: design.html,
        contrastPassed: contrastValidation.passed,
        contrastSummary: contrastValidation.summary,
      };
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
