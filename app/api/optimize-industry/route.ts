import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { ai, AI_MODEL } from '@/lib/openai';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  resumeText: z.string().min(50),
  industry: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { allowed } = await rateLimit(`optimize:${user.id}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json({ message: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    if (!['pro', 'premium', 'admin'].includes(user.plan)) {
      return NextResponse.json(
        { message: 'Industry optimization is available on Pro and Premium plans' },
        { status: 403 }
      );
    }

    // Atomically deduct credit upfront (prevents race condition)
    if (user.plan !== 'admin') {
      const [reserved] = await db.update(users)
        .set({ creditsRemaining: sql`${users.creditsRemaining} - 1` })
        .where(and(eq(users.id, user.id), sql`${users.creditsRemaining} > 0`))
        .returning({ creditsRemaining: users.creditsRemaining });
      if (!reserved) {
        return NextResponse.json({ message: 'No credits remaining' }, { status: 403 });
      }
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { resumeText, industry } = parsed.data;

    const result = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are Robert, an expert resume optimizer specializing in industry-specific optimization.
Given a resume and target industry, return a JSON object with:
- optimizedText: string (the full rewritten resume optimized for the industry)
- addedKeywords: string[] (industry keywords you added)
- removedKeywords: string[] (irrelevant keywords you removed)
- industryTips: string[] (specific advice for this industry)
- confidenceScore: number 0-100 (how well the resume fits the industry now)
Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `Optimize this resume for the ${industry} industry:\n\n${resumeText}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 10000,
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
    console.error('Industry optimization error:', error);
    return NextResponse.json({ message: 'Failed to optimize for industry' }, { status: 500 });
  }
}
