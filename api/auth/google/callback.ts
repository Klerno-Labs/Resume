import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Lazy database connection
let _sql: ReturnType<typeof neon> | null = null;

function getSQL() {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// Helper to detect production environment
function isProductionEnv(req: VercelRequest): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL === '1') return true;
  const host = req.headers.host || '';
  return !host.includes('localhost') && !host.includes('127.0.0.1');
}

// Helper to check if email is admin
function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

// Helper to generate JWT
function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

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

    const sql = getSQL();

    // Find or create user
    let users = await sql`SELECT * FROM users WHERE email = ${googleUser.email}`;
    let user = users[0] as any;
    const admin = isAdmin(googleUser.email);

    if (!user) {
      // Generate secure random password hash for OAuth users (they won't use it, but field is required)
      const secureOAuthHash = crypto.randomBytes(32).toString('hex');

      const result = await sql`
        INSERT INTO users (email, password_hash, name, plan, credits_remaining, email_verified)
        VALUES (${googleUser.email}, ${secureOAuthHash}, ${googleUser.name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 1}, true)
        RETURNING *
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
