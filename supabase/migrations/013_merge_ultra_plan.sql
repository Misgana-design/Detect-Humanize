-- Merge the previous Unlimited and Enterprise tiers into Ultra.
-- Ultra has a 45,000-word monthly quota.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

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

UPDATE public.profiles
SET
  subscription_tier = 'ultra',
  credits = 45000,
  words_used = COALESCE(words_used, 0),
  updated_at = NOW()
WHERE subscription_tier IN ('unlimited', 'enterprise');

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
