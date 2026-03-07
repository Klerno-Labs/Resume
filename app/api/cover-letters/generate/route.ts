import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { coverLetters, users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { ai, AI_MODEL } from '@/lib/openai';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const generateSchema = z.object({
  resumeText: z.string().min(50),
  jobDescription: z.string().min(20),
  tone: z.enum(['professional', 'casual', 'enthusiastic', 'formal']).default('professional'),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { allowed } = rateLimit(`cover-letter:${user.id}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json({ message: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { resumeText, jobDescription, tone, companyName, jobTitle } = parsed.data;

    if (user.plan !== 'admin' && user.creditsRemaining <= 0) {
      return NextResponse.json(
        { message: 'No credits remaining. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    const toneInstructions: Record<string, string> = {
      professional: 'Write in a professional, polished tone. Be confident but not arrogant.',
      casual: 'Write in a conversational, approachable tone. Be personable while staying professional.',
      enthusiastic: 'Write with genuine enthusiasm and energy. Show passion for the role.',
      formal: 'Write in a formal, scholarly tone appropriate for corporate or academic positions.',
    };

    const result = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are Robert, an expert cover letter writer. Generate a compelling cover letter.
${toneInstructions[tone]}
- Address specific requirements from the job description
- Reference achievements from the resume
- Keep it to 3-4 paragraphs
- Open with a hook, not "I am writing to apply for..."
- Close with a confident call to action`,
        },
        {
          role: 'user',
          content: `Write a cover letter for ${jobTitle ? `the ${jobTitle} position` : 'this role'} ${companyName ? `at ${companyName}` : ''}.

RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 6000,
    });

    const content = result.choices[0]?.message?.content || '';

    if (!content) {
      return NextResponse.json(
        { message: 'AI failed to generate a cover letter. Please try again.' },
        { status: 502 }
      );
    }

    // Deduct credit only after successful AI response
    if (user.plan !== 'admin') {
      await db
        .update(users)
        .set({ creditsRemaining: sql`${users.creditsRemaining} - 1` })
        .where(eq(users.id, user.id));
    }

    const [coverLetter] = await db
      .insert(coverLetters)
      .values({
        userId: user.id,
        jobDescription,
        tone,
        content,
      })
      .returning();

    return NextResponse.json({
      id: coverLetter.id,
      content,
      tone,
    });
  } catch (error) {
    console.error('Cover letter error:', error);
    return NextResponse.json(
      { message: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}
