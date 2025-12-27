-- Migration: Add resume_templates table for storing user-created templates
-- This allows users to save their generated designs as reusable templates

CREATE TABLE IF NOT EXISTS "resume_templates" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "style" text NOT NULL,
    "layout" text NOT NULL DEFAULT '2-column',
    "sidebar" text NOT NULL DEFAULT 'left',
    "gradient" text NOT NULL,
    "accent_color" text NOT NULL,
    "fonts" text[] NOT NULL,
    "description" text NOT NULL,
    "html_template" text NOT NULL,
    "is_public" boolean NOT NULL DEFAULT true,
    "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    "usage_count" integer NOT NULL DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "templates_style_idx" ON "resume_templates" ("style");
CREATE INDEX IF NOT EXISTS "templates_public_idx" ON "resume_templates" ("is_public");
CREATE INDEX IF NOT EXISTS "templates_created_by_idx" ON "resume_templates" ("created_by");
CREATE INDEX IF NOT EXISTS "templates_usage_count_idx" ON "resume_templates" ("usage_count" DESC);
