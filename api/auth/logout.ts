import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';
import { isProductionEnv, setupCORSAndHandleOptions } from '../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    if (setupCORSAndHandleOptions(req, res)) return;

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
