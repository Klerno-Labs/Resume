-- Migration: Add missing performance indexes
-- Created: 2026-01-29
-- Description: Adds indexes for commonly queried columns to improve performance

-- Index for resumes.updated_at (used for sorting recent resumes)
CREATE INDEX IF NOT EXISTS resumes_updated_at_idx ON resumes(updated_at DESC);

-- Index for payments.created_at (used for payment history queries)
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments(created_at DESC);

-- Index for subscriptions.current_period_end (critical for checking expirations)
CREATE INDEX IF NOT EXISTS subs_current_period_end_idx ON subscriptions(current_period_end);

-- Composite index for subscriptions status and expiration (common query pattern)
CREATE INDEX IF NOT EXISTS subs_status_period_end_idx ON subscriptions(status, current_period_end)
WHERE status IN ('active', 'trialing');

-- Index for cover_letters user queries
CREATE INDEX IF NOT EXISTS cover_letters_user_id_idx ON cover_letters(user_id);
CREATE INDEX IF NOT EXISTS cover_letters_created_at_idx ON cover_letters(created_at DESC);

COMMENT ON INDEX resumes_updated_at_idx IS 'Improves sorting by last updated date';
COMMENT ON INDEX payments_created_at_idx IS 'Improves payment history queries';
COMMENT ON INDEX subs_current_period_end_idx IS 'Improves subscription expiration checks';
COMMENT ON INDEX subs_status_period_end_idx IS 'Partial index for active subscription queries';
COMMENT ON INDEX cover_letters_user_id_idx IS 'Improves user cover letter lookups';
COMMENT ON INDEX cover_letters_created_at_idx IS 'Improves recent cover letter queries';
