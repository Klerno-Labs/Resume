import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  await db
    .update(users)
    .set({ onboardingCompleted: true })
    .where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
