import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db } from '../lib/db';
import { generateCoverLetter } from '../lib/openai';

const generateSchema = z.object({
  resumeId: z.string().min(1),
  jobDescription: z.string().min(10),
  tone: z.enum(['professional', 'enthusiastic', 'academic', 'creative']),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse and validate request
    const body = generateSchema.parse(req.body);

    // Fetch resume
    const resume = await db
      .selectFrom('resumes')
      .select(['id', 'userId', 'improvedText', 'originalText'])
      .where('id', '=', body.resumeId)
      .executeTakeFirst();

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Use improved text if available, otherwise use original
    const resumeText = resume.improvedText || resume.originalText;

    if (!resumeText) {
      return res.status(400).json({ error: 'Resume has no text content' });
    }

    // Generate cover letter using OpenAI
    const coverLetterResult = await generateCoverLetter(
      resumeText,
      body.jobDescription,
      body.tone
    );
    const coverLetterContent = coverLetterResult.content;

    // Save to database
    const coverLetter = await db
      .insertInto('coverLetters')
      .values({
        userId: resume.userId,
        resumeId: body.resumeId,
        jobDescription: body.jobDescription,
        tone: body.tone,
        content: coverLetterContent,
        createdAt: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return res.status(200).json({
      id: coverLetter.id,
      content: coverLetter.content,
      tone: coverLetter.tone,
      createdAt: coverLetter.createdAt,
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
