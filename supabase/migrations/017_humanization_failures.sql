-- ============================================================
-- Migration 017: humanization_failures
-- Failed humanization requests (AI errors, timeouts, crashes)
-- leave NO trace in the database today — they happen before
-- consume_plan_usage / documents are written — so they are
-- invisible to SQL and only exist in short-lived server logs.
-- This table records one row per failed request so failure
-- rates can be queried alongside usage counters.
--
-- Notable: quota rejections (402) and validation errors return
-- early with normal responses and are NOT written here — this
-- table captures genuine system failures only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.humanization_failures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  source          text NOT NULL DEFAULT 'humanize'
                    CHECK (source IN ('humanize', 'batch')),
  error_message   text NOT NULL,
  status_code     integer,
  word_count      integer,
  detector_target text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- "Failures per user" and "failures over time" are the two
-- queries this table exists for.
CREATE INDEX IF NOT EXISTS idx_humanization_failures_created_at
  ON public.humanization_failures (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_humanization_failures_user_id
  ON public.humanization_failures (user_id);

-- Readable only via the service role (server-side logging).
-- RLS enabled with no policies: all client access denied.
ALTER TABLE public.humanization_failures ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.humanization_failures FROM anon;
REVOKE ALL ON TABLE public.humanization_failures FROM authenticated;
REVOKE ALL ON TABLE public.humanization_failures FROM PUBLIC;
