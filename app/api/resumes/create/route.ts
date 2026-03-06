import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resumes, users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { ai, AI_MODEL, ROBERT_SYSTEM_PROMPT } from '@/lib/openai';
import { z } from 'zod';
import crypto from 'crypto';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  summary: z.string().optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    description: z.string(),
  })).optional(),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    year: z.string(),
  })).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    if (user.plan !== 'admin' && user.creditsRemaining <= 0) {
      return NextResponse.json({ message: 'No credits remaining' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // Build raw resume text from form data
    let text = `${data.name}\n${data.email}`;
    if (data.phone) text += ` | ${data.phone}`;
    text += '\n\n';
    if (data.summary) text += `PROFESSIONAL SUMMARY\n${data.summary}\n\n`;
    if (data.experience?.length) {
      text += 'EXPERIENCE\n';
      for (const exp of data.experience) {
        text += `${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})\n${exp.description}\n\n`;
      }
    }
    if (data.education?.length) {
      text += 'EDUCATION\n';
      for (const edu of data.education) {
        text += `${edu.degree} — ${edu.school} (${edu.year})\n`;
      }
      text += '\n';
    }
    if (data.skills?.length) text += `SKILLS\n${data.skills.join(', ')}\n\n`;
    if (data.certifications?.length) text += `CERTIFICATIONS\n${data.certifications.join('\n')}\n`;

    const contentHash = crypto.createHash('sha256').update(text).digest('hex');

    // Deduct credit
    if (user.plan !== 'admin') {
      await db.update(users).set({ creditsRemaining: sql`${users.creditsRemaining} - 1` }).where(eq(users.id, user.id));
    }

    // Insert and process
    const [resume] = await db.insert(resumes).values({
      userId: user.id,
      fileName: `${data.name.replace(/\s+/g, '-')}-resume`,
      originalFileName: 'manual-entry',
      originalText: text,
      contentHash,
      status: 'processing',
    }).returning();

    // AI optimization
    const [optimizeResult, scoreResult] = await Promise.all([
      ai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: ROBERT_SYSTEM_PROMPT },
          { role: 'user', content: `Optimize this resume for maximum ATS compatibility:\n\n${text}` },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
      ai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: 'Analyze the resume. Return JSON: {atsScore: 0-100, keywordsScore: 0-100, formattingScore: 0-100, issues: [{type, message, severity}]}. Return ONLY valid JSON.' },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    ]);

    const improvedText = optimizeResult.choices[0]?.message?.content || text;
    let atsScore = 75, keywordsScore = 70, formattingScore = 70;
    let issues: Array<{ type: string; message: string; severity: string }> = [];

    try {
      const scoreContent = scoreResult.choices[0]?.message?.content || '{}';
      const cleaned = scoreContent.replace(/```json\n?|```\n?/g, '').trim();
      const scores = JSON.parse(cleaned);
      atsScore = scores.atsScore || 75;
      keywordsScore = scores.keywordsScore || 70;
      formattingScore = scores.formattingScore || 70;
      issues = scores.issues || [];
    } catch { /* use defaults */ }

    const [updated] = await db.update(resumes).set({
      improvedText, atsScore, keywordsScore, formattingScore, issues, status: 'completed', updatedAt: new Date(),
    }).where(eq(resumes.id, resume.id)).returning();

    return NextResponse.json({
      resumeId: updated.id, originalText: text, improvedText, atsScore, keywordsScore, formattingScore, issues, status: 'completed',
    });
  } catch (error) {
    console.error('Create resume error:', error);
    return NextResponse.json({ message: 'Failed to create resume' }, { status: 500 });
  }
}
