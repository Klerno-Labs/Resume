import type { Request, Response } from 'express';
import { getSQL } from '../lib/db.js';

export default async function handler(req: Request, res: Response) {
  // CORS headers
  const origin = req.headers.origin || '';
  const allowedOrigins = ['https://rewriteme.app', 'http://localhost:5174'];
  const isAllowed = allowedOrigins.includes(origin) || origin.includes('vercel.app');

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = getSQL();

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
