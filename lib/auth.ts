import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  creditsRemaining: number;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        plan: users.plan,
        creditsRemaining: users.creditsRemaining,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}
