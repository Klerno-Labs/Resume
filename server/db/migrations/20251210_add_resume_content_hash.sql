-- Migration: Add content-based duplicate detection
-- Author: Resume Builder Team
-- Date: 2025-12-10
-- Purpose: Prevent duplicate resume uploads, protect credits, optimize AI costs

BEGIN;

-- Add new columns for duplicate detection
ALTER TABLE resumes
  ADD COLUMN content_hash TEXT,
  ADD COLUMN original_file_name TEXT;

-- Create index for fast duplicate lookups (critical for performance)
-- CONCURRENTLY allows queries during index creation (zero downtime)
CREATE INDEX CONCURRENTLY IF NOT EXISTS resumes_user_content_hash_idx
  ON resumes(user_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- Backfill content hashes for existing resumes
-- This generates SHA-256 hashes from original_text
UPDATE resumes
SET
  content_hash = encode(digest(original_text, 'sha256'), 'hex'),
  original_file_name = COALESCE(file_name, 'unknown')
WHERE content_hash IS NULL;

-- Make columns NOT NULL after backfill (ensures data integrity)
ALTER TABLE resumes
  ALTER COLUMN content_hash SET NOT NULL,
  ALTER COLUMN original_file_name SET NOT NULL;

COMMIT;

-- Rollback plan (if needed):
-- BEGIN;
-- DROP INDEX IF EXISTS resumes_user_content_hash_idx;
-- ALTER TABLE resumes DROP COLUMN content_hash, DROP COLUMN original_file_name;
-- COMMIT;
