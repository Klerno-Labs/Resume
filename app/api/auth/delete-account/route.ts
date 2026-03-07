import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, resumes, coverLetters, payments } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { allowed } = rateLimit(`delete-account:${user.id}`, 1, 60_000);
    if (!allowed) {
      return NextResponse.json({ message: 'Too many requests. Please wait.' }, { status: 429 });
    }

    // Delete user's data in order (payments → cover letters → resumes → user)
    // Subscriptions cascade automatically via schema onDelete
    await db.delete(payments).where(eq(payments.userId, user.id));
    await db.delete(coverLetters).where(eq(coverLetters.userId, user.id));
    await db.delete(resumes).where(eq(resumes.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));

    // Clear auth cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ message: 'Failed to delete account' }, { status: 500 });
  }
}
