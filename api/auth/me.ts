import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, setupCORSAndHandleOptions } from '../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    if (setupCORSAndHandleOptions(req, res)) return;

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get user from cookie (already handles SELECT properly, no password_hash exposure)
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.json({ authenticated: false, user: null });
    }

    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        creditsRemaining: user.credits_remaining,
        emailVerified: !!user.email_verified, // Convert timestamp to boolean
      },
    });
  } catch (error) {
    console.error('[auth/me] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
