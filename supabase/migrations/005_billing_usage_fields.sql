-- Align profile billing fields with the app's six-plan model and
-- add a single RPC for usage tracking based on words consumed.

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%subscription_tier%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.profiles DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_cadence text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS words_used integer DEFAULT 0;

ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier SET DEFAULT 'free',
  ALTER COLUMN api_usage_count SET DEFAULT 0,
  ALTER COLUMN credits DROP NOT NULL;

UPDATE public.profiles
SET
  subscription_tier = COALESCE(subscription_tier, 'free'),
  billing_cadence = COALESCE(billing_cadence, 'free'),
  api_usage_count = COALESCE(api_usage_count, 0),
  words_used = COALESCE(words_used, 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_subscription_tier_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_subscription_tier_check
      CHECK (
        subscription_tier IN (
          'free',
          'basic',
          'pro',
          'unlimited',
          'enterprise',
          'pro_weekly'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_billing_cadence_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_billing_cadence_check
      CHECK (billing_cadence IN ('free', 'monthly', 'yearly', 'weekly'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_profile_credits(profile_row public.profiles)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE profile_row.subscription_tier
    WHEN 'free' THEN GREATEST(500 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro' THEN GREATEST(20000 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro_weekly' THEN GREATEST(5000 - COALESCE(profile_row.words_used, 0), 0)
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_plan_usage(
  user_id_input uuid,
  words_to_add integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
    words_used = COALESCE(words_used, 0) + words_to_add,
    updated_at = NOW()
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

GRANT EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_profiles_words_used
  ON public.profiles(words_used);
