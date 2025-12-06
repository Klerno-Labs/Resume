import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq } from "drizzle-orm";
import {
  users,
  resumes,
  coverLetters,
  payments,
  type User,
  type InsertUser,
  type Resume,
  type InsertResume,
  type CoverLetter,
  type InsertCoverLetter,
  type Payment,
  type InsertPayment,
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(userId: string, credits: number): Promise<void>;
  updateUserPlan(userId: string, plan: string): Promise<void>;
  updateUserVerification(userId: string, token: string): Promise<void>;
  verifyUserEmail(userId: string): Promise<void>;
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;

  // Resume operations
  getResume(id: string): Promise<Resume | undefined>;
  getResumesByUser(userId: string): Promise<Resume[]>;
  createResume(resume: InsertResume): Promise<Resume>;
  updateResume(id: string, data: Partial<Resume>): Promise<Resume | undefined>;

  // Cover letter operations
  getCoverLetter(id: string): Promise<CoverLetter | undefined>;
  getCoverLettersByUser(userId: string): Promise<CoverLetter[]>;
  createCoverLetter(coverLetter: InsertCoverLetter): Promise<CoverLetter>;

  // Payment operations
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByUser(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: string, status: string, stripeId?: string): Promise<void>;
}

export class PostgresStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserCredits(userId: string, credits: number): Promise<void> {
    await db.update(users).set({ creditsRemaining: credits }).where(eq(users.id, userId));
  }

  async updateUserPlan(userId: string, plan: string): Promise<void> {
    await db.update(users).set({ plan }).where(eq(users.id, userId));
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
    return result[0];
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
    return result[0];
  }

  async updateUserVerification(userId: string, token: string): Promise<void> {
    await db.update(users).set({ verificationToken: token }).where(eq(users.id, userId));
  }

  async verifyUserEmail(userId: string): Promise<void> {
    await db.update(users).set({
      emailVerified: new Date(),
      verificationToken: null
    }).where(eq(users.id, userId));
  }

  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({
      resetToken: token,
      resetTokenExpiry: expiry
    }).where(eq(users.id, userId));
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users).set({
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null
    }).where(eq(users.id, userId));
  }

  // Resume operations
  async getResume(id: string): Promise<Resume | undefined> {
    const result = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
    return result[0];
  }

  async getResumesByUser(userId: string): Promise<Resume[]> {
    return await db.select().from(resumes).where(eq(resumes.userId, userId));
  }

  async createResume(insertResume: InsertResume): Promise<Resume> {
    const result = await db.insert(resumes).values(insertResume).returning();
    return result[0];
  }

  async updateResume(id: string, data: Partial<Resume>): Promise<Resume | undefined> {
    const result = await db
      .update(resumes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(resumes.id, id))
      .returning();
    return result[0];
  }

  // Cover letter operations
  async getCoverLetter(id: string): Promise<CoverLetter | undefined> {
    const result = await db.select().from(coverLetters).where(eq(coverLetters.id, id)).limit(1);
    return result[0];
  }

  async getCoverLettersByUser(userId: string): Promise<CoverLetter[]> {
    return await db.select().from(coverLetters).where(eq(coverLetters.userId, userId));
  }

  async createCoverLetter(insertCoverLetter: InsertCoverLetter): Promise<CoverLetter> {
    const result = await db.insert(coverLetters).values(insertCoverLetter).returning();
    return result[0];
  }

  // Payment operations
  async getPayment(id: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return result[0];
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.userId, userId));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(insertPayment).returning();
    return result[0];
  }

  async updatePaymentStatus(id: string, status: string, stripeId?: string): Promise<void> {
    const updateData: any = { status };
    if (stripeId) {
      updateData.stripePaymentId = stripeId;
    }
    await db.update(payments).set(updateData).where(eq(payments.id, id));
  }
}

export const storage = new PostgresStorage();
