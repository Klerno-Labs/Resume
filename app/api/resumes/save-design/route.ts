import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resumes } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { resumeId, template, accentColor, html } = await req.json();

    if (!resumeId) {
      return NextResponse.json({ message: 'Resume ID required' }, { status: 400 });
    }

    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, user.id)))
      .limit(1);

    if (!resume) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    await db.update(resumes).set({
      analysis: {
        ...(resume.analysis || {}),
        designHtml: html,
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
