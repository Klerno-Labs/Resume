import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import { sql, generateToken, isProductionEnv, isAdmin, parseJSONBody, checkRateLimit, getRateLimitIdentifier, setCORS } from '../_shared.js';

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

    // Rate limiting: 3 registration attempts per minute to prevent spam accounts
    const rateLimitCheck = checkRateLimit(getRateLimitIdentifier(req, null), 3);

    res.setHeader('X-RateLimit-Limit', '3');
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitCheck.resetAt).toISOString());

    if (!rateLimitCheck.allowed) {
      console.log('[auth/register] Rate limit exceeded:', req.headers['x-forwarded-for'] || req.socket?.remoteAddress);
      return res.status(429).json({
        error: 'Too many registration attempts',
        message: 'Please wait before trying again',
        retryAfter: Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000),
      });
    }

    const body = await parseJSONBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    const { email, password, name } = body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Email length check
    if (email.length > 255) {
      return res.status(400).json({ error: 'Email too long' });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password too short',
        message: 'Password must be at least 8 characters long'
      });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: 'Password too long' });
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'password123', 'qwerty123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Please choose a stronger password'
      });
    }

    // Name validation (optional but should be reasonable length)
    if (name && name.length > 255) {
      return res.status(400).json({ error: 'Name too long' });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = isAdmin(email);

    const result = await sql`
      INSERT INTO users (email, password_hash, name, plan, credits_remaining, email_verified)
      VALUES (${email}, ${passwordHash}, ${name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 1}, NULL)
      RETURNING id, email, name, plan, credits_remaining, email_verified, created_at, updated_at
    `;
    const user = result[0] as any;

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
    console.error('[auth/register] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
