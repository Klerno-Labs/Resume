import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 });
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);

    if (!user) {
      return NextResponse.json({ message: 'Invalid verification link.' }, { status: 400 });
    }

    await db
      .update(users)
      .set({ emailVerified: new Date(), verificationToken: null })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
