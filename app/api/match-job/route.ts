import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ai, AI_MODEL } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { message: 'Both resume text and job description are required' },
        { status: 400 }
      );
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
