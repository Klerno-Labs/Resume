import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasJwt: !!process.env.JWT_SECRET,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasStripe: !!process.env.STRIPE_SECRET_KEY
    }
  });
}
