-- ============================================================
-- Migration 010: Fix sync_profile_credits to use correct quotas
-- Root cause: migration 005 used 500 for free tier instead of 1000
-- Also fixes basic (4000) and adds pro_weekly (5000)
-- ============================================================

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
    -- unlimited and enterprise have null credits (no quota)
    ELSE NULL
  END;
END;
$$;

-- Fix any existing free users who have wrong credits (e.g. 10 or 500)
-- Only touch rows where the credits value is clearly wrong for their tier
UPDATE public.profiles
SET credits = 1000
WHERE subscription_tier = 'free'
  AND (credits IS NULL OR credits < 1000)
  AND words_used = 0;

-- Fix the handle_new_user trigger if it exists with wrong default
-- (some deployments may have set credits = 10 as a default)
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
    1000  -- correct free plan quota
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name,  profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
