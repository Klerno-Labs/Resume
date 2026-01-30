import type { Request, Response } from 'express';
import { sql, setupCORSAndHandleOptions } from '../_shared.js';

export default async function handler(req: Request, res: Response) {
  // CORS
  if (setupCORSAndHandleOptions(req as any, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const templates = await sql`
      SELECT
        id,
        name,
        style,
        color_scheme as "colorScheme",
        html_template as "htmlTemplate",
        preview_image_url as "previewImageUrl",
        usage_count as "usageCount"
      FROM resume_templates
      ORDER BY
        CASE style
          WHEN 'modern' THEN 1
          WHEN 'creative' THEN 2
          WHEN 'minimal' THEN 3
          WHEN 'classic' THEN 4
          ELSE 5
        END,
        usage_count DESC,
        created_at DESC
    `;

    return res.json(templates);
  } catch (error) {
    console.error('[Templates] Error fetching templates:', error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
}
