import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const { allowed } = await rateLimit(`forgot:${email}`, 3, 300_000);
    if (!allowed) {
      return NextResponse.json({ message: 'Too many requests. Please wait a few minutes.' }, { status: 429 });
    }

    // Always return success to prevent email enumeration
    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (user && user.passwordHash) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .update(users)
        .set({ resetToken: token, resetTokenExpiry: expiry })
        .where(eq(users.id, user.id));

      try {
        await sendPasswordResetEmail(email, token);
      } catch (err) {
        console.error('Failed to send reset email:', err);
      }
    }

    return NextResponse.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
