import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { sql, generateToken, parseJSONBody, setupCORSAndHandleOptions, setAuthTokenCookie, checkAndApplyRateLimit } from '../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    if (setupCORSAndHandleOptions(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting: 5 login attempts per minute to prevent brute force attacks
    if (!checkAndApplyRateLimit(req, res, 5, 'auth/login')) return;

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
    console.error('[auth/login] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
