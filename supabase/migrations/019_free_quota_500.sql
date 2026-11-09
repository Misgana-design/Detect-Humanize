-- ============================================================
-- Migration 019: Reduce free plan word quota from 1,000 to 500
--
-- Updates every DB function that hardcodes the free-tier quota:
--   • sync_profile_credits       (migrations 005, 008, 010, 010_billing_plan_repair)
--   • consume_plan_usage         (migration 015 — quota CASE block)
--   • get_remaining_credits      (migration 013)
--   • handle_new_user            (migration 010 — seeds credits on signup)
--
-- Also backfills any existing free users who still have credits = 1000
-- and words_used = 0 (i.e. have not consumed any words yet).
-- Users who already consumed words are left untouched.
-- ============================================================

-- ── 1. sync_profile_credits ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_profile_credits(profile_row public.profiles)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN CASE profile_row.subscription_tier
    WHEN 'free'       THEN GREATEST(500   - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'basic'      THEN GREATEST(4000  - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro'        THEN GREATEST(20000 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'ultra'      THEN GREATEST(45000 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro_weekly' THEN GREATEST(5000  - COALESCE(profile_row.words_used, 0), 0)
    ELSE NULL
  END;
END;
$$;

-- ── 2. consume_plan_usage ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.consume_plan_usage(
  user_id_input uuid,
  words_to_add  integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  p                public.profiles%ROWTYPE;
  quota            integer;
  remaining_quota  integer;
  words_from_quota integer;
  words_from_extra integer;
BEGIN
  IF words_to_add IS NULL OR words_to_add < 0 THEN
    RAISE EXCEPTION 'words_to_add must be a non-negative integer';
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = user_id_input;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', user_id_input;
  END IF;

  quota := CASE p.subscription_tier
    WHEN 'free'       THEN 500
    WHEN 'basic'      THEN 4000
    WHEN 'pro'        THEN 20000
    WHEN 'ultra'      THEN 45000
    WHEN 'pro_weekly' THEN 5000
    ELSE NULL
  END;

  remaining_quota  := GREATEST(COALESCE(quota, 0) - COALESCE(p.words_used, 0), 0);
  words_from_quota := LEAST(words_to_add, remaining_quota);
  words_from_extra := words_to_add - words_from_quota;

  UPDATE public.profiles
  SET
    api_usage_count = COALESCE(api_usage_count, 0) + 1,
    words_used      = COALESCE(words_used, 0) + words_from_quota,
    extra_credits   = GREATEST(COALESCE(extra_credits, 0) - words_from_extra, 0),
    credits         = GREATEST(COALESCE(quota, 0) - (COALESCE(words_used, 0) + words_from_quota), 0),
    updated_at      = NOW()
  WHERE id = user_id_input;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) TO service_role;

-- ── 3. get_remaining_credits ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_remaining_credits(user_id_input uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_row public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO profile_row FROM public.profiles WHERE id = user_id_input;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN CASE profile_row.subscription_tier
    WHEN 'free'       THEN GREATEST(500   - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'basic'      THEN GREATEST(4000  - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro'        THEN GREATEST(20000 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'ultra'      THEN GREATEST(45000 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro_weekly' THEN GREATEST(5000  - COALESCE(profile_row.words_used, 0), 0)
    ELSE 0
  END;
END;
$$;

-- ── 4. handle_new_user (signup trigger) ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    subscription_tier,
    billing_cadence,
    words_used,
    api_usage_count,
    credits
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    'free',
    'free',
    0,
    0,
    500  -- free plan quota
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name,  profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  RETURN NEW;
END;
$$;

-- Re-attach the trigger (CREATE OR REPLACE only replaces the function body,
-- not the trigger binding — drop and recreate to be safe).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. Backfill existing free users who haven't consumed any words ───────────
-- Only touches rows where credits is still 1000 and words_used = 0,
-- meaning they signed up under the old quota and haven't used anything yet.
-- Users with words_used > 0 are left exactly as they are.

UPDATE public.profiles
SET
  credits    = 500,
  updated_at = NOW()
WHERE subscription_tier = 'free'
  AND words_used = 0
  AND credits = 1000;
