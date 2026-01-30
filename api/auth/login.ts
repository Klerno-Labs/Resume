import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import { sql, generateToken, isProductionEnv, parseJSONBody, checkRateLimit, getRateLimitIdentifier, setCORS } from '../_shared.js';

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

    // Rate limiting: 5 login attempts per minute to prevent brute force attacks
    const rateLimitCheck = checkRateLimit(getRateLimitIdentifier(req, null), 5);

    res.setHeader('X-RateLimit-Limit', '5');
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitCheck.resetAt).toISOString());

    if (!rateLimitCheck.allowed) {
      console.log('[auth/login] Rate limit exceeded:', req.headers['x-forwarded-for'] || req.socket?.remoteAddress);
      return res.status(429).json({
        error: 'Too many login attempts',
        message: 'Please wait before trying again',
        retryAfter: Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000),
      });
    }

    const body = await parseJSONBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    const { email, password } = body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Security: SELECT only needed columns, not password_hash which we need separately
    const users = await sql`
      SELECT id, email, name, plan, credits_remaining, email_verified, password_hash
      FROM users
      WHERE email = ${email}
    `;
    const user = users[0] as any;

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
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

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        creditsRemaining: user.credits_remaining,
      },
    });
  } catch (error) {
    console.error('[auth/login] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
