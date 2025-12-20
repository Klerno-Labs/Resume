import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('[/api/auth/me] Request received');

    // Simple response without any imports
    return res.json({
      authenticated: false,
      user: null,
      message: 'Minimal handler working - no authentication logic yet'
    });
  } catch (error) {
    console.error('[/api/auth/me] Error:', error);
    return res.status(500).json({
      error: 'Failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
