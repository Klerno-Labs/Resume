import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, setCORS } from '../_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Handle CORS
    const headers: Record<string, string> = {};
    setCORS(req, headers);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getUserFromRequest(req);

    if (!user) {
      return res.json({
        authenticated: false,
        user: null,
      });
    }

    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        creditsRemaining: user.credits_remaining,
        emailVerified: user.email_verified,
      },
    });
  } catch (error) {
    console.error('[/api/auth/me] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
