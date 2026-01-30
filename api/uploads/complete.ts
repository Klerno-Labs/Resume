import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest, parseJSONBody } from '../_shared';
import { enqueueJob } from '../lib/queue.js';

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

    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const body = await parseJSONBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    const { key, filename } = body;
    if (!key || !filename) {
      return res.status(400).json({ error: 'key and filename required' });
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      return res.status(500).json({ error: 'S3_BUCKET not configured' });
    }

    // Create resume placeholder in DB with queued status
    const result = await sql`
      INSERT INTO resumes (user_id, file_name, original_text, status, original_file_name)
      VALUES (${user.id}, ${filename}, ${''}, 'queued', ${filename})
      RETURNING *
    `;
    const resume = result[0] as any;

    // Enqueue background job for worker to fetch object and process
    await enqueueJob({ resumeId: resume.id, bucket, key, filename, userId: user.id });

    return res.json({ resumeId: resume.id, status: 'queued' });
  } catch (err: unknown) {
    console.error('[uploads/complete] Error:', err);
    return res.status(500).json({
      error: 'Failed to complete upload',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
