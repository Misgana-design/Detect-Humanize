-- Repair billing plan support for all checkout/webhook paths.

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
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

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

CREATE OR REPLACE FUNCTION public.sync_profile_credits(profile_row public.profiles)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN CASE profile_row.subscription_tier
    WHEN 'free'         THEN GREATEST(1000  - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'basic'        THEN GREATEST(4000  - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro'          THEN GREATEST(20000 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro_weekly'   THEN GREATEST(5000  - COALESCE(profile_row.words_used, 0), 0)
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
SECURITY INVOKER
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

REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) TO service_role;
