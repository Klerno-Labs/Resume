import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';
import crypto from 'crypto';
import { sql, generateToken, isProductionEnv, isAdmin } from '../../_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const code = req.query.code as string;
    if (!code) {
      return res.redirect(302, '/auth?error=no_code');
    }

    const redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;

    // Exchange code for tokens
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

    if (!tokenRes.ok) {
      console.error('[auth/google/callback] Token exchange failed:', await tokenRes.text());
      return res.redirect(302, '/auth?error=token_failed');
    }

    const tokens = (await tokenRes.json()) as { access_token: string };

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      console.error('[auth/google/callback] User info fetch failed:', await userRes.text());
      return res.redirect(302, '/auth?error=user_info_failed');
    }

    const googleUser = (await userRes.json()) as { email: string; name?: string; id: string };

    // Security: SELECT specific columns only
    let users = await sql`
      SELECT id, email, name, plan, credits_remaining, email_verified, created_at, updated_at
      FROM users
      WHERE email = ${googleUser.email}
    `;
    let user = users[0] as any;
    const admin = isAdmin(googleUser.email);

    if (!user) {
      // Generate secure random password hash for OAuth users (they won't use it, but field is required)
      const secureOAuthHash = crypto.randomBytes(32).toString('hex');

      const result = await sql`
        INSERT INTO users (email, password_hash, name, plan, credits_remaining, email_verified)
        VALUES (${googleUser.email}, ${secureOAuthHash}, ${googleUser.name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 1}, true)
        RETURNING id, email, name, plan, credits_remaining, email_verified, created_at, updated_at
      `;
      user = result[0];
    } else if (admin && user.plan !== 'admin') {
      await sql`UPDATE users SET plan = 'admin', credits_remaining = 9999 WHERE id = ${user.id}`;
      user.plan = 'admin';
      user.credits_remaining = 9999;
    }

    const token = generateToken({ userId: user.id, email: user.email });
    res.setHeader(
      'Set-Cookie',
      serialize('token', token, {
        httpOnly: true,
        secure: isProductionEnv(req),
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
    );

    return res.redirect(302, '/');
  } catch (error) {
    console.error('[auth/google/callback] Error:', error);
    return res.redirect(302, '/auth?error=server_error');
  }
}
