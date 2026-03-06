import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resumes } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const userResumes = await db
      .select({
        id: resumes.id,
        fileName: resumes.fileName,
        atsScore: resumes.atsScore,
        status: resumes.status,
        createdAt: resumes.createdAt,
        updatedAt: resumes.updatedAt,
      })
      .from(resumes)
      .where(eq(resumes.userId, user.id))
      .orderBy(desc(resumes.createdAt));

    return NextResponse.json({ resumes: userResumes });
  } catch (error) {
    console.error('List resumes error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}
