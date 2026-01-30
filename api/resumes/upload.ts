import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getUserFromRequest, checkRateLimit, getRateLimitIdentifier, setupCORSAndHandleOptions } from '../_shared.js';
import formidable from 'formidable';
import fs from 'fs/promises';
import crypto from 'crypto';
import { parseFile } from '../lib/fileParser.js';
import { processResume } from '../lib/processResume.js';

// CRITICAL: Disable Vercel body parsing to handle multipart uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to parse multipart form data using formidable
async function parseMultipartForm(req: VercelRequest): Promise<{
  fields: Record<string, string>;
  files: Array<{ name: string; filename: string; mimetype: string; data: Buffer }>;
}> {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });

    form.parse(req as any, async (err: any, fieldsRaw: any, filesRaw: any) => {
      if (err) return reject(err);

      try {
        const fields: Record<string, string> = {};
        const files: Array<{ name: string; filename: string; mimetype: string; data: Buffer }> = [];

        // Normalize fields (take first value if array)
        for (const key of Object.keys(fieldsRaw || {})) {
          const val = (fieldsRaw as any)[key];
          fields[key] = Array.isArray(val) ? String(val[0]) : String(val);
        }

        // Normalize files
        for (const key of Object.keys(filesRaw || {})) {
          const fileEntry = (filesRaw as any)[key];
          if (!fileEntry) continue;

          // formidable may return either a single file or array
          const fileList = Array.isArray(fileEntry) ? fileEntry : [fileEntry];

          for (const f of fileList) {
            const filepath = f.filepath || f.path || f.file;
            const filename = f.originalFilename || f.name || f.filename || f.newFilename || f.path?.split('/').pop();
            const mimetype = f.mimetype || f.type || 'application/octet-stream';

            if (filepath) {
              const data = await fs.readFile(String(filepath));
              files.push({ name: key, filename: String(filename), mimetype: String(mimetype), data });
              // attempt to remove the temp file
              try {
                await fs.unlink(String(filepath));
              } catch {
                // ignore
              }
            }
          }
        }

        resolve({ fields, files });
      } catch (e) {
        reject(e);
      }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    if (setupCORSAndHandleOptions(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('[Upload] Starting upload handler...');
    const user = await getUserFromRequest(req);
    if (!user) {
      console.log('[Upload] User not authenticated');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`[Upload] User authenticated: ${user.id}, plan: ${user.plan}, credits: ${user.credits_remaining}`);

    // Rate limiting: 10 uploads per minute for free users, 30 for paid users
    const rateLimit = user.plan === 'free' ? 10 : 30;
    const rateLimitCheck = checkRateLimit(getRateLimitIdentifier(req, user), rateLimit);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitCheck.resetAt).toISOString());

    if (!rateLimitCheck.allowed) {
      console.log(`[Upload] Rate limit exceeded for user ${user.id}`);
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again after ${new Date(rateLimitCheck.resetAt).toISOString()}`,
        retryAfter: Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000),
      });
    }

    const contentType = req.headers['content-type'] || '';
    console.log('[Upload] Content-Type:', contentType);
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        error: 'Invalid content type. Expected multipart/form-data',
        received: contentType,
      });
    }

    console.log('[Upload] Parsing multipart form data...');
    let files;
    try {
      const parsed = await parseMultipartForm(req);
      files = parsed.files;
      console.log('[Upload] Files parsed:', files.length);
    } catch (parseError) {
      console.error('[Upload] Parse error:', parseError);
      return res.status(400).json({
        error: 'Failed to parse upload',
        details: parseError instanceof Error ? parseError.message : String(parseError),
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = files[0];
    const { filename, mimetype, data } = file;

    console.log('[Upload] Processing file:', filename, mimetype, `${data.length} bytes`);

    let originalText: string;
    try {
      originalText = await parseFile(data, mimetype, filename);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Failed to parse file';
      console.error('[Upload] File parsing failed:', message);
      return res.status(400).json({
        error: 'File parsing failed',
        message: message,
      });
    }

    let contentHash: string | null = null;
    // Skip duplicate detection for admin users - they can upload anything
    if (user.plan !== 'admin') {
      try {
        contentHash = crypto.createHash('sha256').update(originalText).digest('hex');
        const existingResumes = await sql`
          SELECT id, created_at, status FROM resumes
          WHERE user_id = ${user.id} AND content_hash = ${contentHash}
          LIMIT 1
        `;

        if (Array.isArray(existingResumes) && existingResumes.length > 0) {
          const existing = existingResumes[0] as any;

          // Verify the duplicate resume actually exists and is valid
          const verifyResume = await sql`
            SELECT id, status FROM resumes
            WHERE id = ${existing.id} AND user_id = ${user.id}
          `;

          if (Array.isArray(verifyResume) && verifyResume.length > 0) {
            const verified = verifyResume[0] as any;
            console.log('[Upload] Duplicate detected and verified:', verified.id, 'status:', verified.status);
            return res.status(200).json({
              resumeId: verified.id,
              status: verified.status || 'completed',
              isDuplicate: true,
              message: 'This resume has already been analyzed.',
              originalUploadDate: existing.created_at,
            });
          } else {
            // Duplicate entry exists but resume is gone - allow new upload
            console.log('[Upload] Duplicate hash found but resume deleted, allowing new upload');
            contentHash = crypto.createHash('sha256').update(originalText).digest('hex');
          }
        }
      } catch (dupError) {
        console.warn('[Upload] Duplicate detection failed:', dupError);
        contentHash = null;
      }
    } else {
      // For admin users, still generate hash but don't check for duplicates
      contentHash = crypto.createHash('sha256').update(originalText).digest('hex');
      console.log('[Upload] Admin user - bypassing duplicate detection');
    }

    // ATOMIC CREDIT DEDUCTION - deduct credit BEFORE creating resume to prevent race conditions
    if (user.plan !== 'admin') {
      const updatedUsers = await sql`
        UPDATE users
        SET credits_remaining = credits_remaining - 1
        WHERE id = ${user.id} AND credits_remaining > 0
        RETURNING credits_remaining
      `;

      if (Array.isArray(updatedUsers) && updatedUsers.length === 0) {
        console.log('[Upload] Credit deduction failed - no credits remaining');
        return res.status(403).json({
          error: 'No credits remaining',
          message: 'Please purchase more credits to continue',
        });
      }

      console.log('[Upload] Credit deducted atomically, remaining:', (updatedUsers[0] as any).credits_remaining);
    }

    // Try to insert with content_hash if available, but gracefully handle if columns don't exist
    let result;
    try {
      if (contentHash) {
        result = await sql`
          INSERT INTO resumes (user_id, file_name, original_text, status, content_hash, original_file_name)
          VALUES (${user.id}, ${filename}, ${originalText}, 'processing', ${contentHash}, ${filename})
          RETURNING *
        `;
      } else {
        result = await sql`
          INSERT INTO resumes (user_id, file_name, original_text, status)
          VALUES (${user.id}, ${filename}, ${originalText}, 'processing')
          RETURNING *
        `;
      }
    } catch (insertError) {
      // If insert with content_hash fails (column doesn't exist), try without it
      console.warn('[Upload] Insert with content_hash failed, retrying without:', insertError);
      result = await sql`
        INSERT INTO resumes (user_id, file_name, original_text, status)
        VALUES (${user.id}, ${filename}, ${originalText}, 'processing')
        RETURNING *
      `;
      console.log('[Upload] Resume created without content_hash - migration may not have run');
    }

    const resume = result[0] as any;
    console.log('[Upload] Resume created:', resume.id);

    // IMPORTANT: In serverless environments, we MUST await processing
    // Otherwise the function terminates before OpenAI calls complete
    console.log('[Upload] Starting resume processing...');
    await processResume(resume.id, originalText, user.id, user.plan);
    console.log('[Upload] Resume processing completed');

    return res.json({ resumeId: resume.id, status: 'completed' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Upload] Unexpected error:', errorMessage);
    if (errorStack) console.error('[Upload] Stack:', errorStack);
    return res.status(500).json({
      error: 'Upload failed',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    });
  }
}
