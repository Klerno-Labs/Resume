import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';
import { isProductionEnv, setCORS } from '../_shared.js';

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

    res.setHeader(
      'Set-Cookie',
      serialize('token', '', {
        httpOnly: true,
        secure: isProductionEnv(req),
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('[auth/logout] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
