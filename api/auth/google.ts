import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setupCORSAndHandleOptions, getGoogleCallbackRedirectUri } from '../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    if (setupCORSAndHandleOptions(req, res)) return;

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.APP_URL) {
      console.error('[auth/google] Missing required environment variables');
      return res.redirect(302, '/auth?error=oauth_not_configured');
    }

    const redirectUri = getGoogleCallbackRedirectUri();
    const scope = encodeURIComponent('email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    return res.redirect(302, authUrl);
  } catch (error) {
    console.error('[auth/google] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
