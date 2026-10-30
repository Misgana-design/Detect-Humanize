-- ============================================================
-- Migration 016: Backfill api_usage_count
-- Root cause: rows written before consume_plan_usage existed
-- (or by manual plan-repair SQL) incremented words_used without
-- api_usage_count, leaving the request counter at 0 for users
-- who clearly consumed words.
-- We cannot reconstruct the true historical request count, so
-- the repair is conservative: record at least one request.
-- Idempotent — re-running it changes nothing.
-- ============================================================

UPDATE public.profiles
SET api_usage_count = GREATEST(api_usage_count, 1)
WHERE COALESCE(words_used, 0) > 0
  AND COALESCE(api_usage_count, 0) = 0;
