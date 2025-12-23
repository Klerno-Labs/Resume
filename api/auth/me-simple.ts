import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse } from 'cookie';
import { neon } from '@neondatabase/serverless';

// Simple inline JWT verification without jsonwebtoken library
function verifyTokenSimple(token: string, secret: string): { userId: string; email: string } | null {
  try {
    // For now, just return a test response - we'll add JWT later
    // This tests if the issue is specifically with jsonwebtoken bundling
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    const origin = req.headers.origin || '';
    const allowedOrigins = ['https://rewriteme.app', 'http://localhost:5174'];
    const isAllowed = allowedOrigins.includes(origin) || origin.includes('vercel.app');

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get token from cookie
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.token;

    if (!token) {
      return res.json({ authenticated: false, user: null });
    }

    // For now, just return unauthenticated - testing cookie parsing works
    return res.json({
      authenticated: false,
      user: null,
      debug: { hadToken: true, tokenLength: token.length }
    });
  } catch (error) {
    console.error('[auth/me-simple] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
