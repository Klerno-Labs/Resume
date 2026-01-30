import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { sql, generateToken, isAdmin, setupCORSAndHandleOptions, setAuthTokenCookie, getGoogleCallbackRedirectUri } from '../../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('[auth/google/callback] START - Received callback request');

    // CORS
    if (setupCORSAndHandleOptions(req, res)) return;

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const code = req.query.code as string;
    console.log('[auth/google/callback] Authorization code received:', code ? 'YES' : 'NO');

    if (!code) {
      console.error('[auth/google/callback] No authorization code in request');
      return res.redirect(302, '/auth?error=no_code');
    }

    const redirectUri = getGoogleCallbackRedirectUri();
    console.log('[auth/google/callback] Redirect URI:', redirectUri);
    console.log('[auth/google/callback] Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
    console.log('[auth/google/callback] Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);

    // Exchange code for tokens
    console.log('[auth/google/callback] Exchanging code for tokens...');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    console.log('[auth/google/callback] Token exchange response status:', tokenRes.status);

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('[auth/google/callback] Token exchange failed with status:', tokenRes.status);
      console.error('[auth/google/callback] Token exchange error response:', errorText);
      return res.redirect(302, '/auth?error=token_exchange_failed');
    }

    const tokens = (await tokenRes.json()) as { access_token: string };
    console.log('[auth/google/callback] Tokens received successfully');

    // Get user info
    console.log('[auth/google/callback] Fetching user info from Google...');
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    console.log('[auth/google/callback] User info response status:', userRes.status);

    if (!userRes.ok) {
      const errorText = await userRes.text();
      console.error('[auth/google/callback] User info fetch failed with status:', userRes.status);
      console.error('[auth/google/callback] User info error response:', errorText);
      return res.redirect(302, '/auth?error=user_info_failed');
    }

    const googleUser = (await userRes.json()) as { email: string; name?: string; id: string };
    console.log('[auth/google/callback] Google user info received:', googleUser.email);

    // Security: SELECT specific columns only
    console.log('[auth/google/callback] Querying database for existing user...');
    let users = await sql`
      SELECT id, email, name, plan, credits_remaining, email_verified, created_at, updated_at
      FROM users
      WHERE email = ${googleUser.email}
    `;
    let user = users[0] as any;
    const admin = isAdmin(googleUser.email);
    console.log('[auth/google/callback] User found in DB:', !!user, '| Is admin:', admin);

    if (!user) {
      console.log('[auth/google/callback] Creating new user in database...');
      // Generate secure random password hash for OAuth users (they won't use it, but field is required)
      const secureOAuthHash = crypto.randomBytes(32).toString('hex');

      const result = await sql`
        INSERT INTO users (email, password_hash, name, plan, credits_remaining, email_verified)
        VALUES (${googleUser.email}, ${secureOAuthHash}, ${googleUser.name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 1}, true)
        RETURNING id, email, name, plan, credits_remaining, email_verified, created_at, updated_at
      `;
      user = result[0];
      console.log('[auth/google/callback] New user created with ID:', user.id);
    } else if (admin && user.plan !== 'admin') {
      console.log('[auth/google/callback] Upgrading existing user to admin...');
      await sql`UPDATE users SET plan = 'admin', credits_remaining = 9999 WHERE id = ${user.id}`;
      user.plan = 'admin';
      user.credits_remaining = 9999;
      console.log('[auth/google/callback] User upgraded to admin');
    } else {
      console.log('[auth/google/callback] Existing user logged in, ID:', user.id);
    }

    console.log('[auth/google/callback] Generating JWT token...');
    const token = generateToken({ userId: user.id, email: user.email });
    console.log('[auth/google/callback] JWT token generated successfully');

    console.log('[auth/google/callback] Setting auth cookie...');
    setAuthTokenCookie(res, token, req);
    console.log('[auth/google/callback] Auth cookie set, redirecting to home...');

    return res.redirect(302, '/');
  } catch (error) {
    console.error('[auth/google/callback] FATAL ERROR occurred:');
    console.error('[auth/google/callback] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[auth/google/callback] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[auth/google/callback] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[auth/google/callback] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return res.redirect(302, '/auth?error=oauth_failed');
  }
}
