import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, sql } from "drizzle-orm";
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
  
  // Atomic transaction operations
  processPaymentAndAddCredits(userId: string, paymentData: InsertPayment, creditsToAdd: number): Promise<{ payment: Payment; user: User }>;
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

  // Atomic transaction: Create payment and add credits in a single transaction
  // This ensures data consistency - either both succeed or both fail
  async processPaymentAndAddCredits(
    userId: string,
    paymentData: InsertPayment,
    creditsToAdd: number
  ): Promise<{ payment: Payment; user: User }> {
    // Get a client from the pool for transaction
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');

      // Insert payment record
      const paymentResult = await client.query(
        `INSERT INTO payments (user_id, plan, amount, status, stripe_payment_id) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [paymentData.userId, paymentData.plan, paymentData.amount, paymentData.status || 'completed', paymentData.stripePaymentId]
      );
      const payment = this.mapPaymentRow(paymentResult.rows[0]);

      // Update user credits atomically (using atomic increment)
      const userResult = await client.query(
        `UPDATE users 
         SET credits_remaining = credits_remaining + $1,
             plan = $2
         WHERE id = $3
         RETURNING *`,
        [creditsToAdd, paymentData.plan, userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = this.mapUserRow(userResult.rows[0]);

      // Commit transaction
      await client.query('COMMIT');

      return { payment, user };
    } catch (error) {
      // Rollback on any error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release client back to pool
      client.release();
    }
  }

  // Atomic credit deduction for resume optimization
  async deductCreditAtomic(userId: string): Promise<User | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check and deduct in one atomic operation
      const result = await client.query(
        `UPDATE users 
         SET credits_remaining = credits_remaining - 1
         WHERE id = $1 AND credits_remaining > 0
         RETURNING *`,
        [userId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null; // No credits available or user not found
      }

      await client.query('COMMIT');
      return this.mapUserRow(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper to map database row to User type
  private mapUserRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      plan: row.plan,
      creditsRemaining: row.credits_remaining,
      emailVerified: row.email_verified,
      verificationToken: row.verification_token,
      resetToken: row.reset_token,
      resetTokenExpiry: row.reset_token_expiry,
      createdAt: row.created_at,
    };
  }

  // Helper to map database row to Payment type
  private mapPaymentRow(row: any): Payment {
    return {
      id: row.id,
      userId: row.user_id,
      plan: row.plan,
      amount: row.amount,
      stripePaymentId: row.stripe_payment_id,
      status: row.status,
      createdAt: row.created_at,
    };
  }
}

export const storage = new PostgresStorage();
