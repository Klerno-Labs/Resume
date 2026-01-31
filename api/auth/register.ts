import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { sql, generateToken, isAdmin, parseJSONBody, setupCORSAndHandleOptions, setAuthTokenCookie, checkAndApplyRateLimit } from '../_shared.js';
import { emailSchema, passwordSchema } from '../../shared/validators.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    if (setupCORSAndHandleOptions(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting: 3 registration attempts per minute to prevent spam accounts
    if (!checkAndApplyRateLimit(req, res, 3, 'auth/register')) return;

    const body = await parseJSONBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    const { email, password, name } = body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Validate email using shared schema
    try {
      emailSchema.parse(email);
    } catch (err) {
      return res.status(400).json({
        error: 'Invalid email',
        message: err instanceof Error ? err.message : 'Email validation failed'
      });
    }

    // Validate password using shared schema
    try {
      passwordSchema.parse(password);
    } catch (err) {
      return res.status(400).json({
        error: 'Invalid password',
        message: err instanceof Error ? err.message : 'Password must be at least 12 characters with uppercase, lowercase, number, and special character'
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
      RETURNING id, email, name, plan, credits_remaining, email_verified, created_at
    `;
    const user = result[0] as any;

    const token = generateToken({ userId: user.id, email: user.email });
    setAuthTokenCookie(res, token, req);

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
