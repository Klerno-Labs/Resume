import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resumes } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const VALID_TEMPLATES = ['modern', 'classic', 'minimal', 'creative', 'executive', 'tech'] as const;

const saveDesignSchema = z.object({
  resumeId: z.string().min(1),
  template: z.enum(VALID_TEMPLATES).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
  html: z.string().max(500_000, 'HTML too large').optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = saveDesignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { resumeId, template, accentColor, html } = parsed.data;

    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, user.id)))
      .limit(1);

    if (!resume) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    // Sanitize HTML - strip script tags and event handlers
    let sanitizedHtml = html;
    if (html) {
      sanitizedHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
    }

    await db.update(resumes).set({
      analysis: {
        ...(resume.analysis as Record<string, unknown> || {}),
        designHtml: sanitizedHtml,
        template,
        accentColor,
        savedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    }).where(eq(resumes.id, resumeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save design error:', error);
    return NextResponse.json({ message: 'Failed to save design' }, { status: 500 });
  }
}
