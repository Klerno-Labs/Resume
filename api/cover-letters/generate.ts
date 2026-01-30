import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { sql, getUserFromRequest, parseJSONBody, checkRateLimit, getRateLimitIdentifier, setCORS } from '../_shared.js';
import { generateCoverLetter } from '../lib/openai.js';

const generateSchema = z.object({
  resumeId: z.string().min(1),
  jobDescription: z.string().min(10),
  tone: z.enum(['professional', 'enthusiastic', 'academic', 'creative']),
});

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

    // Authentication required
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Rate limiting: 5-20 cover letters per minute (expensive AI operation)
    const rateLimit = user.plan === 'free' ? 5 : 20;
    const rateLimitCheck = checkRateLimit(getRateLimitIdentifier(req, user), rateLimit);

    res.setHeader('X-RateLimit-Limit', rateLimit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitCheck.resetAt).toISOString());

    if (!rateLimitCheck.allowed) {
      console.log(`[cover-letters/generate] Rate limit exceeded for user ${user.id}`);
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Cover letter generation limit reached. Please wait before generating more.',
        retryAfter: Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000),
      });
    }

    // Parse and validate request
    const body = await parseJSONBody(req);
    const validated = generateSchema.parse(body);

    // Fetch resume - using Neon SQL syntax, not Kysely
    const resumes = await sql`
      SELECT id, user_id, improved_text, original_text
      FROM resumes
      WHERE id = ${validated.resumeId} AND user_id = ${user.id}
    `;
    const resume = resumes[0] as any;

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Use improved text if available, otherwise use original
    const resumeText = resume.improved_text || resume.original_text;

    if (!resumeText) {
      return res.status(400).json({ error: 'Resume has no text content' });
    }

    // Generate cover letter using OpenAI
    const coverLetterResult = await generateCoverLetter(
      resumeText,
      validated.jobDescription,
      validated.tone
    );
    const coverLetterContent = coverLetterResult.content;

    // Save to database - using Neon SQL syntax
    const coverLetters = await sql`
      INSERT INTO cover_letters (user_id, resume_id, job_description, tone, content, created_at)
      VALUES (${resume.user_id}, ${validated.resumeId}, ${validated.jobDescription}, ${validated.tone}, ${coverLetterContent}, NOW())
      RETURNING id, content, tone, created_at
    `;
    const coverLetter = coverLetters[0] as any;

    return res.status(200).json({
      id: coverLetter.id,
      content: coverLetter.content,
      tone: coverLetter.tone,
      createdAt: coverLetter.created_at,
    });
  } catch (error) {
    console.error('[cover-letters/generate] Error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors,
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate cover letter',
    });
  }
}
