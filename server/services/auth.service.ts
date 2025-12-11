import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { storage } from '../storage';
import { UnauthorizedError, ValidationError } from '../lib/errors';
import { generateToken } from '../lib/jwt';
import type { User } from '../../shared/schema';

type RegisterInput = { email: string; password: string; name?: string };
type LoginInput = { email: string; password: string };

export class AuthService {
  async register(data: RegisterInput) {
    const existing = await storage.getUserByEmail(data.email);

    if (existing) {
      throw new ValidationError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await storage.createUser({
      email: data.email,
      passwordHash,
      name: data.name,
      plan: 'free',
      creditsRemaining: 1,
      verificationToken,
    });

    return {
      ...this.buildSession(user),
      verificationToken,
    };
  }

  async login(data: LoginInput) {
    const user = await storage.getUserByEmail(data.email);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return this.buildSession(user);
  }

  private buildSession(user: User) {
    const token = generateToken({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        creditsRemaining: user.creditsRemaining,
        emailVerified: !!user.emailVerified,
      },
      token,
    };
  }
}
