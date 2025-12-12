import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import getRawBody from 'raw-body';
import mammoth from 'mammoth';
import crypto from 'crypto';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

// CRITICAL: Disable body parsing for multipart upload
export const config = {
  api: {
    bodyParser: false,
  },
};

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper to parse multipart form data
async function parseMultipartForm(req: VercelRequest): Promise<{
  fields: Record<string, string>;
  files: Array<{ name: string; filename: string; mimetype: string; data: Buffer }>;
}> {
  const contentType = req.headers['content-type'] || '';
  const boundary = contentType.split('boundary=')[1];

  if (!boundary) {
    throw new Error('No boundary found in Content-Type header');
  }

  const rawBody = await getRawBody(req);
  const parts = rawBody.toString('binary').split(`--${boundary}`);

  const fields: Record<string, string> = {};
  const files: Array<{ name: string; filename: string; mimetype: string; data: Buffer }> = [];

  for (const part of parts) {
    if (part.trim() === '' || part.trim() === '--') continue;

    const [headerSection, ...bodyParts] = part.split('\r\n\r\n');
    if (!headerSection) continue;

    const body = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
    const headers = headerSection.split('\r\n');

    let name = '';
    let filename = '';
    let contentTypeHeader = 'text/plain';

    for (const header of headers) {
      const nameMatch = header.match(/name="([^"]+)"/);
      if (nameMatch) name = nameMatch[1];

      const filenameMatch = header.match(/filename="([^"]+)"/);
      if (filenameMatch) filename = filenameMatch[1];

      if (header.toLowerCase().startsWith('content-type:')) {
        contentTypeHeader = header.split(':')[1].trim();
      }
    }

    if (filename) {
      files.push({
        name,
        filename,
        mimetype: contentTypeHeader,
        data: Buffer.from(body, 'binary'),
      });
    } else if (name) {
      fields[name] = body.trim();
    }
  }

  return { fields, files };
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

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const origin = req.headers.origin || 'https://rewriteme.app';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check credits
    if (user.credits_remaining <= 0 && user.plan !== 'admin') {
      return res.status(403).json({ error: 'No credits remaining' });
    }

    // Verify content type
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        error: 'Invalid content type. Expected multipart/form-data',
        received: contentType,
      });
    }

    console.log('[Upload] Parsing multipart form data...', contentType);
    const { files } = await parseMultipartForm(req);
    console.log('[Upload] Files parsed:', files.length);

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = files[0];
    const { filename, mimetype, data } = file;

    console.log('[Upload] Processing file:', filename, mimetype, `${data.length} bytes`);

    // Parse file content
    const originalText = await parseFileContent(data, mimetype, filename);

    // Check for duplicate
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

    // Create resume record
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

    // Deduct credit
    if (user.plan !== 'admin') {
      await sql`UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ${user.id}`;
      console.log('[Upload] Credit deducted for user:', user.id);
    }

    // Process resume asynchronously
    processResume(resume.id, originalText).catch((err) => {
      console.error('[Upload] Background processing error:', err);
    });

    return res.json({ resumeId: resume.id, status: 'processing' });
  } catch (parseError: any) {
    console.error('[Upload] Error:', parseError);
    return res.status(400).json({
      error: parseError.message || 'Failed to process file',
      details: parseError.stack
    });
  }
}
