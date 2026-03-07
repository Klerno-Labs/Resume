import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          sql`${users.resetTokenExpiry} > NOW()`
        )
      )
      .limit(1);

    if (!user) {
      return NextResponse.json({ message: 'Invalid or expired reset link. Please request a new one.' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await db
      .update(users)
      .set({ passwordHash: hash, resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
