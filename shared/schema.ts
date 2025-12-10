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
  boolean,
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
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "paused",
]);
export const billingIntervalEnum = pgEnum("billing_interval", ["month", "year", "one_time"]);
export const teamRoleEnum = pgEnum("team_role", ["owner", "admin", "member"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "scheduled", "sent"]);

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
    stripeCustomerId: text("stripe_customer_id").unique(),
    currentSubscriptionId: varchar("current_subscription_id"),
    lifetimeValue: integer("lifetime_value").notNull().default(0),
    totalCreditsUsed: integer("total_credits_used").notNull().default(0),
    lastActiveAt: timestamp("last_active_at"),
    onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
    referralCode: text("referral_code").unique(),
    // Self-reference creates circular inference issues in Drizzle typing; keep as plain varchar for now.
    referredBy: varchar("referred_by"),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    planIdx: index("users_plan_idx").on(table.plan),
    emailVerifiedIdx: index("users_email_verified_idx").on(table.emailVerified),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
    stripeCustomerIdx: index("users_stripe_customer_idx").on(table.stripeCustomerId),
    referralCodeIdx: index("users_referral_code_idx").on(table.referralCode),
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
    contentHash: text("content_hash"), // SHA-256 of originalText for duplicate detection (optional for backwards compatibility)
    originalFileName: text("original_file_name"), // Preserve original filename (optional for backwards compatibility)
    originalText: text("original_text").notNull(),
    improvedText: text("improved_text"),
    atsScore: integer("ats_score"),
    keywordsScore: integer("keywords_score"),
    formattingScore: integer("formatting_score"),
    issues: jsonb("issues").$type<
      Array<{ type: string; message: string; severity: string }>
    >(),
    analysis: jsonb("analysis").$type<Record<string, unknown>>(),
    status: resumeStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("resumes_user_id_idx").on(table.userId),
    statusIdx: index("resumes_status_idx").on(table.status),
    createdAtIdx: index("resumes_created_at_idx").on(table.createdAt),
    userStatusIdx: index("resumes_user_status_idx").on(table.userId, table.status),
    userContentHashIdx: index("resumes_user_content_hash_idx").on(table.userId, table.contentHash), // Fast duplicate detection
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

// Subscriptions table
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripePriceId: text("stripe_price_id").notNull(),
    status: subscriptionStatusEnum("status").notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("subs_user_id_idx").on(table.userId),
    statusIdx: index("subs_status_idx").on(table.status),
    stripeSubIdx: index("subs_stripe_sub_idx").on(table.stripeSubscriptionId),
  }),
);

// Usage tracking for metered billing
export const usageRecords = pgTable(
  "usage_records",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: varchar("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    creditsUsed: integer("credits_used").notNull().default(1),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("usage_user_id_idx").on(table.userId),
    actionIdx: index("usage_action_idx").on(table.action),
    createdAtIdx: index("usage_created_at_idx").on(table.createdAt),
  }),
);

// Pricing plans configuration
export const pricingPlans = pgTable(
  "pricing_plans",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    stripePriceId: text("stripe_price_id").unique(),
    amount: integer("amount").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    interval: billingIntervalEnum("interval").notNull(),
    creditsPerMonth: integer("credits_per_month").notNull(),
    maxResumeOptimizations: integer("max_resume_optimizations").notNull(),
    maxCoverLetters: integer("max_cover_letters").notNull(),
    atsReportAccess: boolean("ats_report_access").notNull().default(false),
    pdfExportQuality: text("pdf_export_quality").notNull().default("standard"),
    customTemplatesAccess: boolean("custom_templates_access").notNull().default(false),
    prioritySupport: boolean("priority_support").notNull().default(false),
    aiModelTier: text("ai_model_tier").notNull().default("gpt-3.5"),
    removeWatermark: boolean("remove_watermark").notNull().default(false),
    exportFormats: jsonb("export_formats").$type<string[]>().notNull().default(sql`'["pdf"]'`),
    teamSeats: integer("team_seats").default(1),
    requirePaymentMethod: boolean("require_payment_method").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    features: jsonb("features").$type<string[]>().default(sql`'[]'`),
  },
  (table) => ({
    stripePriceIdx: index("plans_stripe_price_idx").on(table.stripePriceId),
    isActiveIdx: index("plans_is_active_idx").on(table.isActive),
  }),
);

// Referrals table
export const referrals = pgTable(
  "referrals",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    referrerId: varchar("referrer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referredId: varchar("referred_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rewardCredits: integer("reward_credits").notNull().default(5),
    rewardGiven: boolean("reward_given").default(false).notNull(),
    convertedToPaid: boolean("converted_to_paid").default(false).notNull(),
    bonusCredits: integer("bonus_credits").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    referrerIdIdx: index("referrals_referrer_id_idx").on(table.referrerId),
    referredIdIdx: index("referrals_referred_id_idx").on(table.referredId),
  }),
);

// Email campaigns
export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content").notNull(),
  segment: text("segment"),
  sentCount: integer("sent_count").default(0).notNull(),
  openedCount: integer("opened_count").default(0).notNull(),
  clickedCount: integer("clicked_count").default(0).notNull(),
  status: campaignStatusEnum("status").notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Email tracking
export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").references(() => emailCampaigns.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
});

// Analytics events
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    event: text("event").notNull(),
    properties: jsonb("properties").$type<Record<string, unknown>>(),
    page: text("page"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("analytics_user_id_idx").on(table.userId),
    eventIdx: index("analytics_event_idx").on(table.event),
    sessionIdx: index("analytics_session_idx").on(table.sessionId),
    createdAtIdx: index("analytics_created_at_idx").on(table.createdAt),
  }),
);

// Conversion funnel tracking
export const funnelSteps = pgTable(
  "funnel_steps",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: text("session_id").notNull(),
    userId: varchar("user_id").references(() => users.id),
    step: text("step").notNull(),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index("funnel_session_idx").on(table.sessionId),
    stepIdx: index("funnel_step_idx").on(table.step),
  }),
);

// Teams
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: userPlanEnum("plan").notNull().default("pro"),
  maxSeats: integer("max_seats").notNull().default(5),
  usedSeats: integer("used_seats").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Team members
export const teamMembers = pgTable(
  "team_members",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamRoleEnum("role").notNull().default("member"),
    permissions: jsonb("permissions").$type<string[]>(),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => ({
    teamUserIdx: index("team_members_team_user_idx").on(table.teamId, table.userId),
  }),
);
