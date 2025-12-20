import type { VercelRequest, VercelResponse } from '@vercel/node';

// Minimal handler to test if basic functionality works
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('[Minimal] Request received:', req.method, req.url);

    // Test importing db module
    const { sql } = await import('../server/lib/db');
    console.log('[Minimal] DB module imported successfully');

    // Test simple query
    const result = await sql`SELECT 1 as test`;
    console.log('[Minimal] DB query successful:', result);

    return res.json({
      status: 'ok',
      message: 'Minimal handler working',
      dbTest: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Minimal] Error:', error);
    return res.status(500).json({
      error: 'Failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
