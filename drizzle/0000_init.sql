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
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_plan_idx" ON "users" ("plan");
CREATE INDEX IF NOT EXISTS "users_email_verified_idx" ON "users" ("email_verified");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at");

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

CREATE INDEX IF NOT EXISTS "resumes_user_id_idx" ON "resumes" ("user_id");
CREATE INDEX IF NOT EXISTS "resumes_status_idx" ON "resumes" ("status");
CREATE INDEX IF NOT EXISTS "resumes_created_at_idx" ON "resumes" ("created_at");
CREATE INDEX IF NOT EXISTS "resumes_user_status_idx" ON "resumes" ("user_id", "status");

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

CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments" ("user_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");
CREATE INDEX IF NOT EXISTS "payments_stripe_session_idx" ON "payments" ("stripe_session_id");

CREATE TABLE IF NOT EXISTS "sessions" (
    "sid" varchar(255) PRIMARY KEY,
    "sess" jsonb NOT NULL,
    "expire" timestamp NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "session_expire_idx" ON "sessions" ("expire");
