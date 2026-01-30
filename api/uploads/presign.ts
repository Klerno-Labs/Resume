import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, parseJSONBody, setCORS } from '../_shared.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, PutObjectCommand } from '../lib/s3.js';

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

    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const body = await parseJSONBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    const { filename, contentType } = body;
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType required' });
    }

    // Check if S3 is configured
    const bucket = process.env.S3_BUCKET;
    const hasAwsCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !hasAwsCredentials) {
      // S3 not configured - return error so client falls back to multipart upload
      console.log('[uploads/presign] S3 not configured, client will fallback to multipart upload');
      return res.status(503).json({
        error: 'S3 upload not available',
        fallbackToMultipart: true
      });
    }

    const key = `uploads/${user.id}/${Date.now()}-${filename}`;
    const s3 = getS3Client();

    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });

    try {
      const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
      return res.json({ url, key });
    } catch (err: unknown) {
      console.error('[uploads/presign] Error creating presigned URL:', err);
      // Return 503 so client falls back to multipart upload
      return res.status(503).json({
        error: 'Failed to create presigned URL',
        fallbackToMultipart: true
      });
    }
  } catch (error) {
    console.error('[uploads/presign] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
