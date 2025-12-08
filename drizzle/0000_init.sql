CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    CREATE TYPE "user_plan" AS ENUM ('free', 'basic', 'pro', 'premium', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE "resume_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE "payment_status" AS ENUM ('pending', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE "cover_letter_tone" AS ENUM ('professional', 'casual', 'enthusiastic', 'formal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE "subscription_status" AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE "billing_interval" AS ENUM ('month', 'year');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE "team_role" AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE "campaign_status" AS ENUM ('draft', 'scheduled', 'sent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" text NOT NULL UNIQUE,
    "password_hash" text NOT NULL,
    "name" text,
    "plan" user_plan NOT NULL DEFAULT 'free',
    "credits_remaining" integer NOT NULL DEFAULT 0,
    "email_verified" timestamp,
    "verification_token" text,
    "reset_token" text,
    "reset_token_expiry" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "stripe_customer_id" text UNIQUE,
    "current_subscription_id" varchar,
    "lifetime_value" integer NOT NULL DEFAULT 0,
    "total_credits_used" integer NOT NULL DEFAULT 0,
    "last_active_at" timestamp,
    "onboarding_completed" boolean NOT NULL DEFAULT false,
    "referral_code" text UNIQUE,
    "referred_by" varchar REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "stripe_subscription_id" text NOT NULL UNIQUE,
    "stripe_price_id" text NOT NULL,
    "status" subscription_status NOT NULL,
    "current_period_start" timestamp NOT NULL,
    "current_period_end" timestamp NOT NULL,
    "cancel_at_period_end" boolean NOT NULL DEFAULT false,
    "trial_start" timestamp,
    "trial_end" timestamp,
    "metadata" jsonb,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "pricing_plans" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "stripe_price_id" text NOT NULL UNIQUE,
    "amount" integer NOT NULL,
    "currency" text NOT NULL DEFAULT 'usd',
    "interval" billing_interval NOT NULL,
    "features" jsonb NOT NULL,
    "credits_per_month" integer NOT NULL,
    "max_resumes" integer,
    "max_cover_letters" integer,
    "ats_report_access" boolean NOT NULL DEFAULT false,
    "priority_support" boolean NOT NULL DEFAULT false,
    "custom_templates" boolean NOT NULL DEFAULT false,
    "team_seats" integer DEFAULT 1,
    "is_active" boolean NOT NULL DEFAULT true,
    "sort_order" integer NOT NULL DEFAULT 0,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "plans_stripe_price_idx" ON "pricing_plans" ("stripe_price_id");
CREATE INDEX IF NOT EXISTS "plans_is_active_idx" ON "pricing_plans" ("is_active");

CREATE TABLE IF NOT EXISTS "usage_records" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "subscription_id" varchar REFERENCES "subscriptions"("id") ON DELETE set null,
    "action" text NOT NULL,
    "credits_used" integer NOT NULL DEFAULT 1,
    "metadata" jsonb,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "resumes" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar REFERENCES "users"("id"),
    "file_name" text NOT NULL,
    "original_text" text NOT NULL,
    "improved_text" text,
    "ats_score" integer,
    "keywords_score" integer,
    "formatting_score" integer,
    "issues" jsonb,
    "analysis" jsonb,
    "status" resume_status NOT NULL DEFAULT 'pending',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cover_letters" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar REFERENCES "users"("id"),
    "resume_id" varchar REFERENCES "resumes"("id"),
    "job_description" text NOT NULL,
    "tone" cover_letter_tone NOT NULL DEFAULT 'professional',
    "content" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar REFERENCES "users"("id"),
    "stripe_session_id" text UNIQUE,
    "plan" user_plan NOT NULL,
    "amount" integer NOT NULL,
    "stripe_payment_id" text,
    "status" payment_status NOT NULL DEFAULT 'pending',
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
    "sid" varchar(255) PRIMARY KEY,
    "sess" jsonb NOT NULL,
    "expire" timestamp NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "referrals" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "referrer_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "referred_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "reward_credits" integer NOT NULL DEFAULT 5,
    "reward_given" boolean NOT NULL DEFAULT false,
    "converted_to_paid" boolean NOT NULL DEFAULT false,
    "bonus_credits" integer DEFAULT 0,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "email_campaigns" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "subject" text NOT NULL,
    "html_content" text NOT NULL,
    "text_content" text NOT NULL,
    "segment" text,
    "sent_count" integer NOT NULL DEFAULT 0,
    "opened_count" integer NOT NULL DEFAULT 0,
    "clicked_count" integer NOT NULL DEFAULT 0,
    "status" campaign_status NOT NULL DEFAULT 'draft',
    "scheduled_for" timestamp,
    "sent_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar REFERENCES "users"("id") ON DELETE cascade,
    "campaign_id" varchar REFERENCES "email_campaigns"("id") ON DELETE set null,
    "type" text NOT NULL,
    "subject" text NOT NULL,
    "sent_at" timestamp NOT NULL DEFAULT now(),
    "opened_at" timestamp,
    "clicked_at" timestamp,
    "bounced_at" timestamp
);

CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar REFERENCES "users"("id") ON DELETE set null,
    "session_id" text NOT NULL,
    "event" text NOT NULL,
    "properties" jsonb,
    "page" text,
    "referrer" text,
    "user_agent" text,
    "ip_address" text,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "funnel_steps" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "session_id" text NOT NULL,
    "user_id" varchar REFERENCES "users"("id"),
    "step" text NOT NULL,
    "completed_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "teams" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "owner_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "plan" user_plan NOT NULL DEFAULT 'pro',
    "max_seats" integer NOT NULL DEFAULT 5,
    "used_seats" integer NOT NULL DEFAULT 1,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "team_members" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "team_id" varchar NOT NULL REFERENCES "teams"("id") ON DELETE cascade,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "role" team_role NOT NULL DEFAULT 'member',
    "permissions" jsonb,
    "joined_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_plan_idx" ON "users" ("plan");
CREATE INDEX IF NOT EXISTS "users_email_verified_idx" ON "users" ("email_verified");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at");
CREATE INDEX IF NOT EXISTS "users_stripe_customer_idx" ON "users" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "users_referral_code_idx" ON "users" ("referral_code");

CREATE INDEX IF NOT EXISTS "resumes_user_id_idx" ON "resumes" ("user_id");
CREATE INDEX IF NOT EXISTS "resumes_status_idx" ON "resumes" ("status");
CREATE INDEX IF NOT EXISTS "resumes_created_at_idx" ON "resumes" ("created_at");
CREATE INDEX IF NOT EXISTS "resumes_user_status_idx" ON "resumes" ("user_id", "status");

CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments" ("user_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");
CREATE INDEX IF NOT EXISTS "payments_stripe_session_idx" ON "payments" ("stripe_session_id");

CREATE INDEX IF NOT EXISTS "subs_user_id_idx" ON "subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "subs_status_idx" ON "subscriptions" ("status");
CREATE INDEX IF NOT EXISTS "subs_stripe_sub_idx" ON "subscriptions" ("stripe_subscription_id");

CREATE INDEX IF NOT EXISTS "usage_user_id_idx" ON "usage_records" ("user_id");
CREATE INDEX IF NOT EXISTS "usage_action_idx" ON "usage_records" ("action");
CREATE INDEX IF NOT EXISTS "usage_created_at_idx" ON "usage_records" ("created_at");

CREATE INDEX IF NOT EXISTS "referrals_referrer_id_idx" ON "referrals" ("referrer_id");
CREATE INDEX IF NOT EXISTS "referrals_referred_id_idx" ON "referrals" ("referred_id");

CREATE INDEX IF NOT EXISTS "analytics_user_id_idx" ON "analytics_events" ("user_id");
CREATE INDEX IF NOT EXISTS "analytics_event_idx" ON "analytics_events" ("event");
CREATE INDEX IF NOT EXISTS "analytics_session_idx" ON "analytics_events" ("session_id");
CREATE INDEX IF NOT EXISTS "analytics_created_at_idx" ON "analytics_events" ("created_at");

CREATE INDEX IF NOT EXISTS "funnel_session_idx" ON "funnel_steps" ("session_id");
CREATE INDEX IF NOT EXISTS "funnel_step_idx" ON "funnel_steps" ("step");

CREATE INDEX IF NOT EXISTS "team_members_team_user_idx" ON "team_members" ("team_id","user_id");

CREATE INDEX IF NOT EXISTS "session_expire_idx" ON "sessions" ("expire");
