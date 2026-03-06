import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { ai, AI_MODEL } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    if (user.plan !== 'admin' && user.creditsRemaining <= 0) {
      return NextResponse.json(
        { message: 'No credits remaining. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { message: 'Both resume text and job description are required' },
        { status: 400 }
      );
    }

    if (user.plan !== 'admin') {
      await db
        .update(users)
        .set({ creditsRemaining: sql`${users.creditsRemaining} - 1` })
        .where(eq(users.id, user.id));
    }

    const result = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are Robert, an expert job-resume matcher. Analyze how well a resume matches a job description.
Return a JSON object with:
- score: number 0-100 (overall match)
- strengths: string[] (what matches well)
- missingKeywords: string[] (keywords in the job but not the resume)
- suggestions: string[] (actionable improvements)
Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = result.choices[0]?.message?.content || '{}';
    const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();
    const analysis = JSON.parse(cleaned);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Job match error:', error);
    return NextResponse.json(
      { message: 'Failed to analyze job match' },
      { status: 500 }
    );
  }
}
