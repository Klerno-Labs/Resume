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
    const resumes = await sql`SELECT * FROM resumes WHERE id = ${resumeId} AND user_id = ${user.id}`;

    if (resumes.length === 0) {
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
            content: `You are a minimalist resume designer creating expensive-looking resumes for 2025. Your designs are EXTREMELY MINIMAL, clean, and typographically disciplined. Key principles: (1) Maximum white space - nothing cramped, generous margins (0.5-1 inch), consistent vertical rhythm, (2) ONE professional font only (Lato, Calibri, or Georgia) at 10-11pt body, 11-12pt headers, 14-18pt name, (3) ONE subtle accent color for structure only (navy, deep green, or burgundy), (4) Perfect alignment and pixel-precise spacing consistency, (5) NO icons, NO photos, NO graphics, NO decorative elements, (6) Looks like a premium business document first, designed object second. Think: minimalist luxury, Swiss design, NOT Canva templates. Always output valid JSON.`,
          },
          {
            role: 'user',
            content: `Create an EXTREMELY MINIMAL, CLEAN resume design. Use template: ${template.name} (${template.layout} layout).

Resume content:
${resume.improved_text || resume.original_text}

Use accent color: ${template.accentColor}
Use font: ${template.fonts[0]}

CRITICAL: Return ONLY valid JSON with format: {"html": "<!DOCTYPE html>..."}`,
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
