import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';
import Stripe from 'stripe';
import busboy from 'busboy';
import mammoth from 'mammoth';
import crypto from 'crypto';

// Initialize services
const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

// CRITICAL: Disable Vercel body parsing globally to handle multipart uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Price configuration
const PRICES = {
  basic: { amount: 700, credits: 1, name: 'Basic Plan' },
  pro: { amount: 1900, credits: 3, name: 'Pro Plan' },
  premium: { amount: 2900, credits: 999, name: 'Premium Plan' },
} as const;

// Helper to parse multipart form data using busboy
async function parseMultipartForm(req: VercelRequest): Promise<{
  fields: Record<string, string>;
  files: Array<{ name: string; filename: string; mimetype: string; data: Buffer }>;
}> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: Array<{ name: string; filename: string; mimetype: string; data: Buffer }> = [];

    const bb = busboy({ headers: req.headers as any });

    bb.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks: Buffer[] = [];

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        files.push({
          name,
          filename,
          mimetype: mimeType,
          data: Buffer.concat(chunks),
        });
      });
    });

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('finish', () => {
      resolve({ fields, files });
    });

    bb.on('error', (error) => {
      reject(error);
    });

    req.pipe(bb);
  });
}

// Helper to parse file content
async function parseFileContent(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  let text = '';

  try {
    if (mimetype === 'application/pdf') {
      throw new Error('PDF parsing not supported in serverless. Please upload DOCX or TXT format.');
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/zip' ||
      mimetype === 'application/octet-stream'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (mimetype === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }

    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (!text || text.length < 50) {
      throw new Error('File contains insufficient text content (minimum 50 characters required)');
    }

    return text;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to parse file');
  }
}

// Helper to get raw body as Buffer (for webhooks, etc.)
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Helper to parse JSON from request body
async function parseJSONBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve(JSON.parse(body));
      } catch (error: any) {
        console.error('[parseJSONBody] Error:', error.message);
        reject(new Error(`Failed to parse JSON body: ${error.message}`));
      }
    });

    req.on('error', (error) => {
      reject(error);
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

// Helper to get user from request
async function getUserFromRequest(req: VercelRequest): Promise<any | null> {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const users = await sql`SELECT * FROM users WHERE id = ${decoded.userId}`;
  return users[0] || null;
}

// Check if user is admin
function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

// Background resume processing
async function processResume(resumeId: string, originalText: string) {
  try {
    const [optimizationResult, scoreResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Optimize resumes. Output JSON only.' },
          {
            role: 'user',
            content: `Rewrite this resume with strong action verbs and quantified achievements.\n\n${originalText}\n\n{"improvedText": "optimized resume"}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Score resumes. Output JSON only.' },
          {
            role: 'user',
            content: `Score this resume.\n\n${originalText.substring(0, 1500)}\n\n{"atsScore": 0-100, "keywordsScore": 0-10, "formattingScore": 0-10, "issues": [{"type": "issue", "message": "fix", "severity": "high"}]}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      }),
    ]);

    const optimization = JSON.parse(optimizationResult.choices[0].message.content || '{}');
    const scores = JSON.parse(scoreResult.choices[0].message.content || '{}');

    await sql`
      UPDATE resumes SET
        improved_text = ${optimization.improvedText || originalText},
        ats_score = ${scores.atsScore || 70},
        keywords_score = ${scores.keywordsScore || 7},
        formatting_score = ${scores.formattingScore || 7},
        issues = ${JSON.stringify(scores.issues || [])},
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;
  } catch (error) {
    console.error('Process error:', error);
    await sql`UPDATE resumes SET status = 'failed' WHERE id = ${resumeId}`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { url, method } = req;
    const path = url?.split('?')[0] || '';

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
        return res.status(401).json({ error: 'Not authenticated' });
      }
      return res.json({
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
        VALUES (${email}, ${passwordHash}, ${name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 0}, NULL)
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
        const result = await sql`
          INSERT INTO users (email, password_hash, name, plan, credits_remaining, email_verified)
          VALUES (${googleUser.email}, ${`google_oauth_${googleUser.id}`}, ${googleUser.name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 0}, NOW())
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

      return res.json({
        id: resume.id,
        userId: resume.user_id,
        fileName: resume.file_name,
        originalText: resume.original_text,
        improvedText: resume.improved_text,
        atsScore: resume.ats_score,
        keywordsScore: resume.keywords_score,
        formattingScore: resume.formatting_score,
        issues: resume.issues,
        status: resume.status,
        createdAt: resume.created_at,
        updatedAt: resume.updated_at,
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

        if (user.credits_remaining <= 0 && user.plan !== 'admin') {
          console.log('[Upload] No credits remaining');
          return res.status(403).json({ error: 'No credits remaining' });
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
        const { files } = await parseMultipartForm(req);
        console.log('[Upload] Files parsed:', files.length);

        if (!files || files.length === 0) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = files[0];
        const { filename, mimetype, data } = file;

        console.log('[Upload] Processing file:', filename, mimetype, `${data.length} bytes`);

        const originalText = await parseFileContent(data, mimetype, filename);

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

        if (user.plan !== 'admin') {
          await sql`UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ${user.id}`;
          console.log('[Upload] Credit deducted for user:', user.id);
        }

        processResume(resume.id, originalText).catch((err) => {
          console.error('[Upload] Background processing error:', err);
        });

        return res.json({ resumeId: resume.id, status: 'processing' });
      } catch (parseError: any) {
        console.error('[Upload] Error:', parseError);
        console.error('[Upload] Stack:', parseError.stack);
        return res.status(400).json({
          error: parseError.message || 'Failed to process file',
          message: parseError.message,
          stack: process.env.NODE_ENV === 'development' ? parseError.stack : undefined
        });
      }
    }

    // Create Stripe checkout session
    if (path === '/api/payments/create-checkout' && method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const body = await parseJSONBody(req);
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
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
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
  } catch (error: any) {
    console.error('API Error:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Background resume processing
async function processResume(resumeId: string, originalText: string) {
  try {
    const [optimizationResult, scoreResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Optimize resumes. Output JSON only.' },
          {
            role: 'user',
            content: `Rewrite this resume with strong action verbs and quantified achievements.\n\n${originalText}\n\n{"improvedText": "optimized resume"}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Score resumes. Output JSON only.' },
          {
            role: 'user',
            content: `Score this resume.\n\n${originalText.substring(0, 1500)}\n\n{"atsScore": 0-100, "keywordsScore": 0-10, "formattingScore": 0-10, "issues": [{"type": "issue", "message": "fix", "severity": "high"}]}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      }),
    ]);

    const optimization = JSON.parse(optimizationResult.choices[0].message.content || '{}');
    const scores = JSON.parse(scoreResult.choices[0].message.content || '{}');

    await sql`
      UPDATE resumes SET
        improved_text = ${optimization.improvedText || originalText},
        ats_score = ${scores.atsScore || 70},
        keywords_score = ${scores.keywordsScore || 7},
        formatting_score = ${scores.formattingScore || 7},
        issues = ${JSON.stringify(scores.issues || [])},
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;
  } catch (error) {
    console.error('Process error:', error);
    await sql`UPDATE resumes SET status = 'failed' WHERE id = ${resumeId}`;
  }
}
