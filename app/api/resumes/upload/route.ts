import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resumes, users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { ai, AI_MODEL, ROBERT_SYSTEM_PROMPT } from '@/lib/openai';
import { rateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

async function parseFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const mod = await import('pdf-parse');
    const pdfParse = (mod as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default;
    const parsed = await pdfParse(buffer);
    return parsed.text;
  } else {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Please sign in to upload a resume' }, { status: 401 });
    }

    const { allowed } = rateLimit(`upload:${user.id}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json({ message: 'Too many uploads. Please wait a moment.' }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Please upload a PDF or DOCX file' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseFile(buffer, file.type);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { message: 'Could not extract enough text from the file. Please try a different format.' },
        { status: 400 }
      );
    }

    // Duplicate check
    const contentHash = crypto.createHash('sha256').update(text).digest('hex');
    const existing = await db
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.userId, user.id), eq(resumes.contentHash, contentHash)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'You have already uploaded this resume', resumeId: existing[0].id },
        { status: 409 }
      );
    }

    // Check credits
    if (user.plan !== 'admin' && user.creditsRemaining <= 0) {
      return NextResponse.json(
        { message: 'No credits remaining. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // Insert resume as processing
    const [resume] = await db
      .insert(resumes)
      .values({
        userId: user.id,
        fileName: file.name,
        originalFileName: file.name,
        originalText: text,
        contentHash,
        status: 'processing',
      })
      .returning();

    // Process with Z.AI (sequential to avoid rate limits)
    const optimizeResult = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: ROBERT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Optimize this resume for maximum ATS compatibility and recruiter appeal. Return ONLY the improved resume text, no explanations:\n\n${text}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 10000,
    });

    const scoreResult = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an ATS scoring system. Analyze the resume and return a JSON object with: atsScore (0-100), keywordsScore (0-100), formattingScore (0-100), issues (array of {type, message, severity}). Return ONLY valid JSON.',
        },
        { role: 'user', content: `Score this resume:\n\n${text}` },
      ],
      temperature: 0.3,
      max_tokens: 6000,
    });

    const improvedText = optimizeResult.choices[0]?.message?.content || text;

    let atsScore = 75;
    let keywordsScore = 70;
    let formattingScore = 70;
    let issues: Array<{ type: string; message: string; severity: string }> = [];

    try {
      const scoreContent = scoreResult.choices[0]?.message?.content || '{}';
      const cleaned = scoreContent.replace(/```json\n?|```\n?/g, '').trim();
      const scores = JSON.parse(cleaned);
      atsScore = scores.atsScore || 75;
      keywordsScore = scores.keywordsScore || 70;
      formattingScore = scores.formattingScore || 70;
      issues = scores.issues || [];
    } catch {
      // Use defaults
    }

    // Deduct credit only after successful AI processing
    if (user.plan !== 'admin') {
      await db
        .update(users)
        .set({ creditsRemaining: sql`${users.creditsRemaining} - 1` })
        .where(eq(users.id, user.id));
    }

    // Update resume
    const [updated] = await db
      .update(resumes)
      .set({
        improvedText,
        atsScore,
        keywordsScore,
        formattingScore,
        issues,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(resumes.id, resume.id))
      .returning();

    return NextResponse.json({
      resumeId: updated.id,
      originalText: text,
      improvedText,
      atsScore,
      keywordsScore,
      formattingScore,
      issues,
      status: 'completed',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { message: 'Failed to process resume. Please try again.' },
      { status: 500 }
    );
  }
}
