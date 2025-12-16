import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';
import Stripe from 'stripe';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, getObjectBuffer, PutObjectCommand, GetObjectCommand } from '../server/lib/s3';
import { sql } from '../server/lib/db';
import { processResume } from '../server/lib/processResume';
import { enqueueJob } from '../server/lib/queue';
import { parseFile } from '../server/lib/fileParser';
import { initSentry, captureError } from '../server/lib/sentry';
import formidable from 'formidable';
import fs from 'fs/promises';
import crypto from 'crypto';

// Validate critical environment variables
function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('[ENV] Missing required environment variables:', missing.join(', '));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('[ENV] All required environment variables validated');
}

// Validate on module load
validateEnv();
initSentry();

// Initialize services
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// CRITICAL: Disable Vercel body parsing globally to handle multipart uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const REQUIRED_SCHEMA_COLUMNS = ['content_hash', 'original_file_name'];

async function verifySchema(): Promise<void> {
  const colsLiteral = REQUIRED_SCHEMA_COLUMNS.map((col) => `'${col}'`).join(', ');
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'resumes'
      AND column_name IN (${colsLiteral})
  `;
  const existing = (rows ?? []).map((row: any) => row.column_name);

  const missing = REQUIRED_SCHEMA_COLUMNS.filter((col) => !existing.includes(col));
  if (missing.length > 0) {
    throw new Error(
      `Missing required schema columns on resumes table: ${missing.join(', ')}. Run npm run db:push.`,
    );
  }
  console.log('[Schema] Required columns present');
}

const startupChecks = verifySchema();

// Price configuration
const PRICES = {
  basic: { amount: 700, credits: 1, name: 'Basic Plan' },
  pro: { amount: 1900, credits: 3, name: 'Pro Plan' },
  premium: { amount: 2900, credits: 999, name: 'Premium Plan' },
} as const;

// Helper to parse multipart form data using formidable (serverless-friendly)
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

// Use shared file parser `parseFile` from server/lib/fileParser

// Helper to get raw body as Buffer (for webhooks, etc.)
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    // If stream has already been read and body exists on req, try to use it
    try {
      // @ts-ignore - some runtimes attach parsed body
      if (req.body && typeof req.body === 'string') {
        return resolve(Buffer.from(req.body, 'utf8'));
      }
    } catch (e) {
      // ignore and continue to stream reading
    }

    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    // On error, resolve an empty buffer rather than reject to avoid crashing
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}

// Helper to parse JSON from request body
async function parseJSONBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];

    // If a parsed body was attached by the runtime, return it directly
    try {
      // @ts-ignore
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      // @ts-ignore
      if (req.body && typeof req.body === 'string') return resolve(JSON.parse(req.body));
    } catch (e) {
      console.warn('[parseJSONBody] Pre-parsed body parse failed, falling back to stream');
    }

    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))));

    req.on('end', () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf-8').trim();
        if (!bodyStr) return resolve(null);
        try {
          return resolve(JSON.parse(bodyStr));
        } catch (err) {
          console.error('[parseJSONBody] JSON.parse failed:', err instanceof Error ? err.message : String(err));
          // Return null instead of rejecting so callers can handle missing/invalid JSON gracefully
          return resolve(null);
        }
      } catch (error) {
        console.error('[parseJSONBody] Unknown error reading body:', error);
        return resolve(null);
      }
    });

    req.on('error', (error) => {
      console.error('[parseJSONBody] Stream error:', error);
      return resolve(null);
    });
  });
}

// Helper to generate JWT
function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

// Helper to verify JWT
function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
  } catch {
    return null;
  }
}

// User interface
interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  plan: string;
  credits_remaining: number;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

// Helper to get user from request
async function getUserFromRequest(req: VercelRequest): Promise<User | null> {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const users = await sql`SELECT * FROM users WHERE id = ${decoded.userId}`;
  return (users[0] as User) || null;
}

// Check if user is admin
function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

function getRequestPath(req: VercelRequest): string {
  try {
    const origin =
      req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : 'https://localhost');
    const url = new URL(req.url || '/', origin);
    return url.pathname;
  } catch {
    return req.url?.split('?')[0] || '';
  }
}

// Main API handler - handles all /api/* requests
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || 'GET';
  const path = getRequestPath(req);
  try {
    await startupChecks;
    console.log(`[${method}] ${path}`);

    // CORS - use request origin or default
    const origin = req.headers.origin || 'https://rewriteme.app';
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (method === 'OPTIONS') {
      return res.status(200).end();
    }
    // Health check
    if (path === '/api' || path === '/api/health') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Auth: Get current user
    if (path === '/api/auth/me' && method === 'GET') {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.json({
          authenticated: false,
          user: null,
        });
      }
      return res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          creditsRemaining: user.credits_remaining,
          emailVerified: user.email_verified,
        },
      });
    }

    // Auth: Login
    if (path === '/api/auth/login' && method === 'POST') {
      const body = await parseJSONBody(req);
      if (!body) {
        return res.status(400).json({ error: 'Empty request body' });
      }
      const { email, password } = body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const users = await sql`SELECT * FROM users WHERE email = ${email}`;
      const user = users[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken({ userId: user.id, email: user.email });
      const isProduction =
        req.headers.host?.includes('rewriteme.app') || process.env.VERCEL === '1';
      res.setHeader(
        'Set-Cookie',
        serialize('token', token, {
          httpOnly: true,
          secure: isProduction,
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
    }

    // Auth: Register
    if (path === '/api/auth/register' && method === 'POST') {
      const body = await parseJSONBody(req);
      if (!body) {
        return res.status(400).json({ error: 'Empty request body' });
      }
      const { email, password, name } = body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const admin = isAdmin(email);

      const result = await sql`
        INSERT INTO users (email, password_hash, name, plan, credits_remaining, email_verified)
        VALUES (${email}, ${passwordHash}, ${name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 1}, NULL)
        RETURNING *
      `;
      const user = result[0];

      const token = generateToken({ userId: user.id, email: user.email });
      const isProduction =
        req.headers.host?.includes('rewriteme.app') || process.env.VERCEL === '1';
      res.setHeader(
        'Set-Cookie',
        serialize('token', token, {
          httpOnly: true,
          secure: isProduction,
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
    }

    // Auth: Logout
    if (path === '/api/auth/logout' && method === 'POST') {
      const isProductionLogout =
        req.headers.host?.includes('rewriteme.app') || process.env.VERCEL === '1';
      res.setHeader(
        'Set-Cookie',
        serialize('token', '', {
          httpOnly: true,
          secure: isProductionLogout,
          sameSite: 'lax',
          maxAge: 0,
          path: '/',
        })
      );
      return res.json({ success: true });
    }

    // Auth: Google OAuth initiate
    if (path === '/api/auth/google' && method === 'GET') {
      const redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;
      const scope = encodeURIComponent('email profile');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
      return res.redirect(302, authUrl);
    }

    // Auth: Google OAuth callback
    if (path === '/api/auth/google/callback' && method === 'GET') {
      const code = req.query.code as string;
      if (!code) {
        return res.redirect(302, '/auth?error=no_code');
      }

      const redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;

      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        return res.redirect(302, '/auth?error=token_failed');
      }

      const tokens = (await tokenRes.json()) as { access_token: string };

      // Get user info
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userRes.ok) {
        return res.redirect(302, '/auth?error=user_info_failed');
      }

      const googleUser = (await userRes.json()) as { email: string; name?: string; id: string };

      // Find or create user
      let users = await sql`SELECT * FROM users WHERE email = ${googleUser.email}`;
      let user = users[0];
      const admin = isAdmin(googleUser.email);

      if (!user) {
        // Generate secure random password hash for OAuth users (they won't use it, but field is required)
        const secureOAuthHash = crypto.randomBytes(32).toString('hex');

        const result = await sql`
          INSERT INTO users (email, password_hash, name, plan, credits_remaining, email_verified)
          VALUES (${googleUser.email}, ${secureOAuthHash}, ${googleUser.name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 1}, true)
          RETURNING *
        `;
        user = result[0];
      } else if (admin && user.plan !== 'admin') {
        await sql`UPDATE users SET plan = 'admin', credits_remaining = 9999 WHERE id = ${user.id}`;
        user.plan = 'admin';
        user.credits_remaining = 9999;
      }

      const token = generateToken({ userId: user.id, email: user.email });
      const isProductionOAuth =
        req.headers.host?.includes('rewriteme.app') || process.env.VERCEL === '1';
      res.setHeader(
        'Set-Cookie',
        serialize('token', token, {
          httpOnly: true,
          secure: isProductionOAuth,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        })
      );

      return res.redirect(302, '/');
    }

    // Get resumes
    if (path === '/api/resumes' && method === 'GET') {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const resumes =
        await sql`SELECT * FROM resumes WHERE user_id = ${user.id} ORDER BY created_at DESC`;
      return res.json(resumes);
    }

    // Get single resume
    if (path.match(/^\/api\/resumes\/[^/]+$/) && method === 'GET') {
      const resumeId = path.split('/').pop();
      const resumes = await sql`SELECT * FROM resumes WHERE id = ${resumeId}`;
      const resume = resumes[0];

      if (!resume) {
        return res.status(404).json({ error: 'Resume not found' });
      }

      // Get user to check if they can access improved text
      const user = await getUserFromRequest(req);
      // Free users can only see assessment (scores/issues), not the improved text
      // Paid users (basic/pro/premium/admin) can see everything
      const canAccessImprovedText = user && user.plan !== 'free';

      return res.json({
        id: resume.id,
        userId: resume.user_id,
        fileName: resume.file_name,
        originalText: resume.original_text,
        improvedText: canAccessImprovedText ? resume.improved_text : null,
        atsScore: resume.ats_score,
        keywordsScore: resume.keywords_score,
        formattingScore: resume.formatting_score,
        issues: resume.issues,
        status: resume.status,
        createdAt: resume.created_at,
        updatedAt: resume.updated_at,
        requiresUpgrade: !canAccessImprovedText && resume.status === 'completed',
      });
    }

    // Upload resume - handle multipart file upload
    if (path === '/api/resumes/upload' && method === 'POST') {
      try {
        console.log('[Upload] Starting upload handler...');
        const user = await getUserFromRequest(req);
        if (!user) {
          console.log('[Upload] User not authenticated');
          return res.status(401).json({ error: 'Not authenticated' });
        }

        console.log(`[Upload] User authenticated: ${user.id}, plan: ${user.plan}, credits: ${user.credits_remaining}`);

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
        try {
          contentHash = crypto.createHash('sha256').update(originalText).digest('hex');
          const existingResumes = await sql`
            SELECT id, created_at FROM resumes
            WHERE user_id = ${user.id} AND content_hash = ${contentHash}
            LIMIT 1
          `;

          if (existingResumes.length > 0) {
            const existing = existingResumes[0];
            console.log('[Upload] Duplicate detected:', existing.id);
            return res.status(200).json({
              resumeId: existing.id,
              status: 'completed',
              isDuplicate: true,
              message: 'This resume has already been analyzed.',
              originalUploadDate: existing.created_at,
            });
          }
        } catch (dupError) {
          console.warn('[Upload] Duplicate detection failed:', dupError);
          contentHash = null;
        }

        // ATOMIC CREDIT DEDUCTION - deduct credit BEFORE creating resume to prevent race conditions
        // This ensures that even if two uploads happen simultaneously, only one succeeds
        if (user.plan !== 'admin') {
          const updatedUsers = await sql`
            UPDATE users
            SET credits_remaining = credits_remaining - 1
            WHERE id = ${user.id} AND credits_remaining > 0
            RETURNING credits_remaining
          `;

          if (updatedUsers.length === 0) {
            console.log('[Upload] Credit deduction failed - no credits remaining');
            return res.status(403).json({
              error: 'No credits remaining',
              message: 'Please purchase more credits to continue'
            });
          }

          console.log('[Upload] Credit deducted atomically, remaining:', updatedUsers[0].credits_remaining);
        }

        let result;
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

        const resume = result[0];
        console.log('[Upload] Resume created:', resume.id);

        processResume(resume.id, originalText, user.id, user.plan).catch((err) => {
          console.error('[Upload] Background processing error:', err);
        });

        return res.json({ resumeId: resume.id, status: 'processing' });
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

    // Presign upload (direct-to-S3) - returns PUT url and object key
    if (path === '/api/uploads/presign' && method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'Not authenticated' });

      const body = await parseJSONBody(req);
      if (!body) return res.status(400).json({ error: 'Empty request body' });

      const { filename, contentType } = body;
      if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' });

      const bucket = process.env.S3_BUCKET;
      if (!bucket) return res.status(500).json({ error: 'S3_BUCKET not configured' });

      const key = `uploads/${user.id}/${Date.now()}-${filename}`;
      const s3 = getS3Client();

      const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
      try {
        const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
        return res.json({ url, key });
      } catch (err: unknown) {
        console.error('Presign error:', err);
        return res.status(500).json({ error: 'Failed to create presigned URL' });
      }
    }

    // Complete upload: enqueue job for background worker to fetch from S3 and process
    if (path === '/api/uploads/complete' && method === 'POST') {
      try {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const body = await parseJSONBody(req);
        if (!body) return res.status(400).json({ error: 'Empty request body' });
        const { key, filename } = body;
        if (!key || !filename) return res.status(400).json({ error: 'key and filename required' });

        const bucket = process.env.S3_BUCKET;
        if (!bucket) return res.status(500).json({ error: 'S3_BUCKET not configured' });

        // Create resume placeholder in DB with queued status
        const result = await sql`
          INSERT INTO resumes (user_id, file_name, original_text, status, original_file_name)
          VALUES (${user.id}, ${filename}, ${''}, 'queued', ${filename})
          RETURNING *
        `;
        const resume = result[0];

        // Enqueue background job for worker to fetch object and process
        await enqueueJob({ resumeId: resume.id, bucket, key, filename, userId: user.id });

        return res.json({ resumeId: resume.id, status: 'queued' });
      } catch (err: unknown) {
        console.error('[UploadComplete] Error:', err);
        return res.status(500).json({ error: 'Failed to complete upload' });
      }
    }

    // Create Stripe checkout session
    if (path === '/api/payments/create-checkout' && method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const body = await parseJSONBody(req);
      if (!body) return res.status(400).json({ error: 'Empty request body' });
      const { plan } = body;
      if (!plan || !PRICES[plan as keyof typeof PRICES]) {
        return res.status(400).json({ error: 'Invalid plan' });
      }

      const priceConfig = PRICES[plan as keyof typeof PRICES];

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: priceConfig.name,
                description: `${priceConfig.credits === 999 ? 'Unlimited' : priceConfig.credits} resume optimization${priceConfig.credits !== 1 ? 's' : ''}`,
              },
              unit_amount: priceConfig.amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/#pricing`,
        customer_email: user.email,
        metadata: {
          userId: user.id,
          plan: plan,
          credits: priceConfig.credits.toString(),
        },
      });

      return res.json({ url: session.url });
    }

    // Verify payment success
    if (path === '/api/payments/verify' && method === 'POST') {
      const body = await parseJSONBody(req);
      if (!body) return res.status(400).json({ error: 'Empty request body' });
      const { sessionId } = body;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const credits = parseInt(session.metadata?.credits || '0');

        if (userId && plan) {
          // Update user plan and credits
          await sql`
            UPDATE users 
            SET plan = ${plan}, credits_remaining = credits_remaining + ${credits}
            WHERE id = ${userId}
          `;

          // Record payment
          await sql`
            INSERT INTO payments (user_id, stripe_session_id, plan, amount, status)
            VALUES (${userId}, ${sessionId}, ${plan}, ${session.amount_total}, 'completed')
            ON CONFLICT (stripe_session_id) DO NOTHING
          `;

          return res.json({ success: true, plan, credits });
        }
      }

      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Stripe webhook
    if (path === '/api/webhooks/stripe' && method === 'POST') {
      const sig = req.headers['stripe-signature'] as string;

      let event: Stripe.Event;
      try {
        // For webhooks, we must use the raw request body exactly as received
        const rawBody = await getRawBody(req);
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Webhook signature verification failed:', message);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const credits = parseInt(session.metadata?.credits || '0');

        if (userId && plan && session.payment_status === 'paid') {
          await sql`
            UPDATE users
            SET plan = ${plan}, credits_remaining = credits_remaining + ${credits}
            WHERE id = ${userId}
          `;

          await sql`
            INSERT INTO payments (user_id, stripe_session_id, plan, amount, status)
            VALUES (${userId}, ${session.id}, ${plan}, ${session.amount_total}, 'completed')
            ON CONFLICT (stripe_session_id) DO NOTHING
          `;
        }
      }

      return res.json({ received: true });
    }

    // Analytics: Track event
    if (path === '/api/analytics/event' && method === 'POST') {
      const body = await parseJSONBody(req);
      if (!body) return res.status(400).json({ error: 'Empty request body' });
      const { event, properties, page, referrer, sessionId } = body;

      if (!event || !sessionId) {
        return res.status(400).json({ error: 'Event name and sessionId required' });
      }

      // Get user if authenticated (optional for analytics)
      const user = await getUserFromRequest(req);
      const userId = user?.id || null;

      const userAgent = req.headers['user-agent'] || null;
      const ipAddress =
        (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || null;

      // Store analytics event (gracefully handle if table doesn't exist yet)
      try {
        await sql`
          INSERT INTO analytics_events (user_id, session_id, event, properties, page, referrer, user_agent, ip_address)
          VALUES (${userId}, ${sessionId}, ${event}, ${JSON.stringify(properties || {})}, ${page || null}, ${referrer || null}, ${userAgent}, ${ipAddress})
        `;
      } catch (err) {
        // Silently ignore if analytics table doesn't exist - don't break the app
        console.warn('Analytics event failed (table may not exist):', err);
      }

      return res.json({ success: true });
    }

    // Analytics: Track funnel step
    if (path.match(/^\/api\/analytics\/funnel\/[^/]+$/) && method === 'POST') {
      const step = path.split('/').pop();
      const body = await parseJSONBody(req);
      if (!body) return res.status(400).json({ error: 'Empty request body' });
      const { sessionId } = body;

      if (!step || !sessionId) {
        return res.status(400).json({ error: 'Step and sessionId required' });
      }

      // Get user if authenticated (optional for analytics)
      const user = await getUserFromRequest(req);
      const userId = user?.id || null;

      // Store funnel step (gracefully handle if table doesn't exist yet)
      try {
        await sql`
          INSERT INTO funnel_steps (session_id, step, user_id)
          VALUES (${sessionId}, ${step}, ${userId})
        `;
      } catch (err) {
        // Silently ignore if funnel table doesn't exist - don't break the app
        console.warn('Funnel tracking failed (table may not exist):', err);
      }

      return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    captureError(err, { method, path });
    const errorMessage = err.message || 'Unknown error';
    const errorStack = err.stack;
    console.error('API Error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    return res.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
}

// Background resume processing
    // Use `processResume` from server/lib/processResume for background processing
