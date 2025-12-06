import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

// Initialize services
const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, method, body } = req;
  const path = url?.split('?')[0] || '';
  
  // CORS - use request origin or default
  const origin = req.headers.origin || 'https://rewriteme.app';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
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
        }
      });
    }

    // Auth: Login
    if (path === '/api/auth/login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      
      const users = await sql`SELECT * FROM users WHERE email = ${email}`;
      const user = users[0];
      
      if (!user || !await bcrypt.compare(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = generateToken({ userId: user.id, email: user.email });
      const isProduction = req.headers.host?.includes('rewriteme.app') || process.env.VERCEL === '1';
      res.setHeader('Set-Cookie', serialize('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      }));
      
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          creditsRemaining: user.credits_remaining,
        }
      });
    }

    // Auth: Register
    if (path === '/api/auth/register' && method === 'POST') {
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
        VALUES (${email}, ${passwordHash}, ${name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 1}, false)
        RETURNING *
      `;
      const user = result[0];
      
      const token = generateToken({ userId: user.id, email: user.email });
      const isProduction = req.headers.host?.includes('rewriteme.app') || process.env.VERCEL === '1';
      res.setHeader('Set-Cookie', serialize('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      }));
      
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          creditsRemaining: user.credits_remaining,
        }
      });
    }

    // Auth: Logout
    if (path === '/api/auth/logout' && method === 'POST') {
      const isProductionLogout = req.headers.host?.includes('rewriteme.app') || process.env.VERCEL === '1';
      res.setHeader('Set-Cookie', serialize('token', '', {
        httpOnly: true,
        secure: isProductionLogout,
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      }));
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
      
      const tokens = await tokenRes.json() as { access_token: string };
      
      // Get user info
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      
      if (!userRes.ok) {
        return res.redirect(302, '/auth?error=user_info_failed');
      }
      
      const googleUser = await userRes.json() as { email: string; name?: string; id: string };
      
      // Find or create user
      let users = await sql`SELECT * FROM users WHERE email = ${googleUser.email}`;
      let user = users[0];
      const admin = isAdmin(googleUser.email);
      
      if (!user) {
        const result = await sql`
          INSERT INTO users (email, password_hash, name, plan, credits_remaining, email_verified)
          VALUES (${googleUser.email}, ${`google_oauth_${googleUser.id}`}, ${googleUser.name || null}, ${admin ? 'admin' : 'free'}, ${admin ? 9999 : 1}, true)
          RETURNING *
        `;
        user = result[0];
      } else if (admin && user.plan !== 'admin') {
        await sql`UPDATE users SET plan = 'admin', credits_remaining = 9999 WHERE id = ${user.id}`;
        user.plan = 'admin';
        user.credits_remaining = 9999;
      }
      
      const token = generateToken({ userId: user.id, email: user.email });
      const isProductionOAuth = req.headers.host?.includes('rewriteme.app') || process.env.VERCEL === '1';
      res.setHeader('Set-Cookie', serialize('token', token, {
        httpOnly: true,
        secure: isProductionOAuth,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      }));
      
      return res.redirect(302, '/');
    }

    // Get resumes
    if (path === '/api/resumes' && method === 'GET') {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const resumes = await sql`SELECT * FROM resumes WHERE user_id = ${user.id} ORDER BY created_at DESC`;
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

    // Upload resume (simplified - no file upload in serverless, just text)
    if (path === '/api/resumes/upload' && method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      if (user.credits_remaining <= 0 && user.plan !== 'admin') {
        return res.status(403).json({ error: 'No credits remaining' });
      }
      
      const { text, fileName } = body;
      if (!text) {
        return res.status(400).json({ error: 'Resume text required' });
      }
      
      // Create resume
      const result = await sql`
        INSERT INTO resumes (user_id, file_name, original_text, status)
        VALUES (${user.id}, ${fileName || 'resume.txt'}, ${text}, 'processing')
        RETURNING *
      `;
      const resume = result[0];
      
      // Deduct credit
      if (user.plan !== 'admin') {
        await sql`UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ${user.id}`;
      }
      
      // Process with OpenAI (async)
      processResume(resume.id, text).catch(console.error);
      
      return res.json({ resumeId: resume.id });
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
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
          { role: 'user', content: `Rewrite this resume with strong action verbs and quantified achievements.\n\n${originalText}\n\n{"improvedText": "optimized resume"}` }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Score resumes. Output JSON only.' },
          { role: 'user', content: `Score this resume.\n\n${originalText.substring(0, 1500)}\n\n{"atsScore": 0-100, "keywordsScore": 0-10, "formattingScore": 0-10, "issues": [{"type": "issue", "message": "fix", "severity": "high"}]}` }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      })
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
