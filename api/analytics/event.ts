import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest, parseJSONBody, setCORS } from '../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    const headers: Record<string, string> = {};
    setCORS(req, headers);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = await parseJSONBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    const { event, properties, page, referrer, sessionId } = body;

    if (!event || !sessionId) {
      return res.status(400).json({ error: 'Event name and sessionId required' });
    }

    // Get user if authenticated (optional for analytics)
    const user = await getUserFromRequest(req);
    const userId = user?.id || null;

    const userAgent = req.headers['user-agent'] || null;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || null;

    // Store analytics event (gracefully handle if table doesn't exist yet)
    try {
      await sql`
        INSERT INTO analytics_events (user_id, session_id, event, properties, page, referrer, user_agent, ip_address)
        VALUES (${userId}, ${sessionId}, ${event}, ${JSON.stringify(properties || {})}, ${page || null}, ${referrer || null}, ${userAgent}, ${ipAddress})
      `;
    } catch (err) {
      // Silently ignore if analytics table doesn't exist - don't break the app
      console.warn('[analytics/event] Failed (table may not exist):', err);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[analytics/event] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
