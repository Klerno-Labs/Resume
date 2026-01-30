import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { sql, getUserFromRequest } from '../_shared';
import { sanitizeResumeHTML, extractDesignProperties } from '../lib/sanitizeTemplate.js';

const saveTemplateSchema = z.object({
  name: z.string().min(3).max(100),
  style: z.enum(['modern', 'classic', 'creative', 'minimal']),
  description: z.string().min(10).max(500),
  htmlContent: z.string().min(100),
  isPublic: z.boolean().optional().default(true),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    const headers: Record<string, string> = {};
    const { setCORS } = await import('../_shared');
    setCORS(req, headers);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

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

    // Only premium+ users can save templates
    if (!['premium', 'pro', 'admin'].includes(user.plan)) {
      return res.status(403).json({
        error: 'Upgrade required',
        message: 'Only Premium, Pro, and Admin users can save custom templates.',
      });
    }

    // Parse and validate request
    const body = saveTemplateSchema.parse(req.body);

    console.log('[Save Template] User:', user.id, 'Name:', body.name);

    // Sanitize HTML to remove personal information
    const sanitizedHTML = sanitizeResumeHTML(body.htmlContent);

    // Extract design properties
    const designProps = extractDesignProperties(sanitizedHTML);

    // Save template to database
    const result = await sql`
      INSERT INTO resume_templates (
        name,
        style,
        layout,
        sidebar,
        gradient,
        accent_color,
        fonts,
        description,
        html_template,
        is_public,
        created_by
      ) VALUES (
        ${body.name},
        ${body.style},
        '2-column',
        'left',
        ${designProps.gradient || 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)'},
        ${designProps.accentColor || '#3b82f6'},
        ${designProps.fonts.length > 0 ? designProps.fonts : ['Inter', 'Roboto']},
        ${body.description},
        ${sanitizedHTML},
        ${body.isPublic},
        ${user.id}
      )
      RETURNING id, name, style, description, created_at
    `;

    const savedTemplate = result[0];

    console.log('[Save Template] Success! Template ID:', savedTemplate.id);

    return res.status(201).json({
      success: true,
      template: {
        id: savedTemplate.id,
        name: savedTemplate.name,
        style: savedTemplate.style,
        description: savedTemplate.description,
        createdAt: savedTemplate.created_at,
      },
      message: 'Template saved successfully!',
    });
  } catch (error) {
    console.error('[Save Template] Error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors,
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
