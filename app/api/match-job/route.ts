import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const matchSchema = z.object({
  resumeText: z.string().min(50).max(50000),
  jobDescription: z.string().min(20).max(50000),
});
import { ai, AI_MODEL } from '@/lib/openai';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { allowed } = await rateLimit(`match-job:${user.id}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json({ message: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    // Atomically deduct credit upfront (prevents race condition)
    if (user.plan !== 'admin') {
      const [reserved] = await db.update(users)
        .set({ creditsRemaining: sql`${users.creditsRemaining} - 1` })
        .where(and(eq(users.id, user.id), sql`${users.creditsRemaining} > 0`))
        .returning({ creditsRemaining: users.creditsRemaining });
      if (!reserved) {
        return NextResponse.json(
          { message: 'No credits remaining. Please upgrade your plan.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = matchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { resumeText, jobDescription } = parsed.data;

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
      max_tokens: 6000,
    });

    const content = result.choices[0]?.message?.content || '{}';
    const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { message: 'AI returned an invalid response. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Job match error:', error);
    return NextResponse.json(
      { message: 'Failed to analyze job match' },
      { status: 500 }
    );
  }
}
