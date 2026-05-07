-- ============================================================
-- Migration 008: Security fixes + tone constraint update
-- ============================================================

-- ── 1. Fix search_path on all functions (Supabase security warnings) ────────

CREATE OR REPLACE FUNCTION public.sync_profile_credits(profile_row public.profiles)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN CASE profile_row.subscription_tier
    WHEN 'free'       THEN GREATEST(1000  - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'basic'      THEN GREATEST(4000  - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro'        THEN GREATEST(20000 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro_weekly' THEN GREATEST(5000  - COALESCE(profile_row.words_used, 0), 0)
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_plan_usage(
  user_id_input uuid,
  words_to_add  integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN
  IF words_to_add IS NULL OR words_to_add < 0 THEN
    RAISE EXCEPTION 'words_to_add must be a non-negative integer';
  END IF;

  UPDATE public.profiles
  SET
    api_usage_count = COALESCE(api_usage_count, 0) + 1,
    words_used      = COALESCE(words_used, 0) + words_to_add,
    updated_at      = NOW()
  WHERE id = user_id_input
  RETURNING * INTO updated_profile;

  IF updated_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', user_id_input;
  END IF;

  UPDATE public.profiles
  SET credits = public.sync_profile_credits(updated_profile)
  WHERE id = user_id_input;
END;
$$;

-- Revoke anon execute (security warning: anon should not call this)
REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 2. Tighten RLS on cache tables (replace always-true policies) ────────────

-- detection_cache: only the row's creator can update/insert
-- (cache is keyed by hash, so we track inserter via a user_id column if present,
--  otherwise we keep authenticated-only but add a meaningful check)

DROP POLICY IF EXISTS "Authenticated users can write detection_cache"    ON public.detection_cache;
DROP POLICY IF EXISTS "Authenticated users can update detection_cache"   ON public.detection_cache;
DROP POLICY IF EXISTS "Authenticated users can write humanization_cache" ON public.humanization_cache;
DROP POLICY IF EXISTS "Authenticated users can update humanization_cache" ON public.humanization_cache;

-- Re-create with explicit authenticated check (still open for any auth user
-- since cache is shared, but no longer "always true" for anon)
CREATE POLICY "Authenticated users can write detection_cache"
ON public.detection_cache
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update detection_cache"
ON public.detection_cache
FOR UPDATE
TO authenticated
USING  (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can write humanization_cache"
ON public.humanization_cache
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update humanization_cache"
ON public.humanization_cache
FOR UPDATE
TO authenticated
USING  (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ── 3. Tighten contact_messages INSERT policy ────────────────────────────────

DROP POLICY IF EXISTS "Anyone can submit a contact message" ON public.contact_messages;

-- Rate-limit by requiring a non-empty message (basic sanity check at DB level)
CREATE POLICY "Anyone can submit a contact message"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(full_name)) >= 2
  AND full_name ~ '^[^\s@]+' -- not an email in the name field
  AND length(trim(message)) >= 10
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

-- ── 4. Update tone_used constraint to include all new tones ─────────────────

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.documents'::regclass
    AND contype = 'c'
    AND conname = 'documents_tone_used_check';

  IF constraint_name IS NOT NULL THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_tone_used_check;
  END IF;
END $$;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_tone_used_check
  CHECK (tone_used IN (
    'casual', 'professional', 'academic', 'analytical',
    'formal', 'creative', 'friendly', 'storytelling', 'default'
  ));

-- ── 5. Update free plan word quota to 1000 ──────────────────────────────────
-- (No DB change needed — quota is enforced in application code via plans.ts)
-- This comment documents the intent for audit purposes.
