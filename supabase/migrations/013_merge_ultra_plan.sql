-- Merge the previous Unlimited and Enterprise tiers into Ultra.
-- Ultra has a 45,000-word monthly quota.

BEGIN;

DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%subscription_tier%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I',
      constraint_row.conname
    );
  END LOOP;
END $$;

UPDATE public.profiles
SET
  subscription_tier = 'ultra',
  credits = 45000,
  words_used = COALESCE(words_used, 0),
  updated_at = NOW()
WHERE subscription_tier IN ('unlimited', 'enterprise');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE subscription_tier IS NOT NULL
      AND subscription_tier NOT IN ('free', 'basic', 'pro', 'ultra', 'pro_weekly')
  ) THEN
    RAISE EXCEPTION 'Unexpected subscription_tier values remain. Run SELECT subscription_tier, COUNT(*) FROM public.profiles GROUP BY subscription_tier;';
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (
    subscription_tier IN (
      'free',
      'basic',
      'pro',
      'ultra',
      'pro_weekly'
    )
  );

CREATE OR REPLACE FUNCTION public.get_remaining_credits(user_id_input uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_row public.profiles%ROWTYPE;
BEGIN
  SELECT *
    INTO profile_row
    FROM public.profiles
   WHERE id = user_id_input;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN CASE profile_row.subscription_tier
    WHEN 'free'       THEN GREATEST(1000  - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'basic'      THEN GREATEST(4000  - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro'        THEN GREATEST(20000 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'ultra'      THEN GREATEST(45000 - COALESCE(profile_row.words_used, 0), 0)
    WHEN 'pro_weekly' THEN GREATEST(5000  - COALESCE(profile_row.words_used, 0), 0)
    ELSE 0
  END;
END;
$$;

COMMIT;
