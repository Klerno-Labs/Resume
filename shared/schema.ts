import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Enums for safer type constraints
export const userPlanEnum = pgEnum("user_plan", [
  "free",
  "basic",
  "pro",
  "premium",
  // Retain admin for existing Google OAuth flow
  "admin",
]);
export const resumeStatusEnum = pgEnum("resume_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
]);
export const coverLetterToneEnum = pgEnum("cover_letter_tone", [
  "professional",
  "casual",
  "enthusiastic",
  "formal",
]);

// Users table
export const users = pgTable(
  "users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    plan: userPlanEnum("plan").notNull().default("free"),
    creditsRemaining: integer("credits_remaining").notNull().default(0),
    emailVerified: timestamp("email_verified"),
    verificationToken: text("verification_token"),
    resetToken: text("reset_token"),
    resetTokenExpiry: timestamp("reset_token_expiry"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    planIdx: index("users_plan_idx").on(table.plan),
    emailVerifiedIdx: index("users_email_verified_idx").on(table.emailVerified),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
  }),
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Resumes table
export const resumes = pgTable(
  "resumes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    fileName: text("file_name").notNull(),
    originalText: text("original_text").notNull(),
    improvedText: text("improved_text"),
    atsScore: integer("ats_score"),
    keywordsScore: integer("keywords_score"),
    formattingScore: integer("formatting_score"),
    issues: jsonb("issues").$type<
      Array<{ type: string; message: string; severity: string }>
    >(),
    analysis: jsonb("analysis").$type<Record<string, any>>(),
    status: resumeStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("resumes_user_id_idx").on(table.userId),
    statusIdx: index("resumes_status_idx").on(table.status),
    createdAtIdx: index("resumes_created_at_idx").on(table.createdAt),
    userStatusIdx: index("resumes_user_status_idx").on(table.userId, table.status),
  }),
);

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertResume = typeof resumes.$inferInsert;
export type Resume = typeof resumes.$inferSelect;

// Cover Letters table
export const coverLetters = pgTable("cover_letters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  resumeId: varchar("resume_id").references(() => resumes.id),
  jobDescription: text("job_description").notNull(),
  tone: coverLetterToneEnum("tone").notNull().default("professional"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCoverLetterSchema = createInsertSchema(coverLetters).omit({
  id: true,
  createdAt: true,
});
export type InsertCoverLetter = typeof coverLetters.$inferInsert;
export type CoverLetter = typeof coverLetters.$inferSelect;

// Payments table
export const payments = pgTable(
  "payments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    stripeSessionId: text("stripe_session_id").unique(),
    plan: userPlanEnum("plan").notNull(),
    amount: integer("amount").notNull(), // in cents
    stripePaymentId: text("stripe_payment_id"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("payments_user_id_idx").on(table.userId),
    statusIdx: index("payments_status_idx").on(table.status),
    stripeSessionIdx: index("payments_stripe_session_idx").on(table.stripeSessionId),
  }),
);

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});
export type InsertPayment = typeof payments.$inferInsert;
export type Payment = typeof payments.$inferSelect;

// Sessions table for express-session / connect-pg-simple
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    expireIdx: index("session_expire_idx").on(table.expire),
  }),
);

export type Session = typeof sessions.$inferSelect;
