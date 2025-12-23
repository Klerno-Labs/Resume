import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';

// Helper to detect production environment
function isProductionEnv(req: VercelRequest): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL === '1') return true;
  const host = req.headers.host || '';
  return !host.includes('localhost') && !host.includes('127.0.0.1');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    const origin = req.headers.origin || '';
    const allowedOrigins = ['https://rewriteme.app', 'http://localhost:5174'];
    const isAllowed = allowedOrigins.includes(origin) || origin.includes('vercel.app');

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    res.setHeader(
      'Set-Cookie',
      serialize('token', '', {
        httpOnly: true,
        secure: isProductionEnv(req),
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('[auth/logout] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
