-- ============================================================
-- Migration 015: One-time extra credit packs
-- Adds a separate, non-expiring credit balance (extra_credits)
-- that is consumed only AFTER a plan's monthly/weekly quota is
-- exhausted. Purchased credits survive plan changes/downgrades.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS extra_credits integer NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- consume_plan_usage: quota-first consumption.
-- Words that fit within the remaining monthly/weekly quota are
-- counted against words_used. Any overflow is drawn from the
-- one-time extra_credits pool (never expires).
-- ------------------------------------------------------------
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
    WHEN 'free'       THEN 1000
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
GRANT EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) TO service_role;

-- ------------------------------------------------------------
-- add_extra_credits: credited by the Polar webhook after a
-- successful one-time credit pack purchase. Returns the new balance.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_extra_credits(
  user_id_input uuid,
  words_to_add  integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  IF words_to_add IS NULL OR words_to_add < 0 THEN
    RAISE EXCEPTION 'words_to_add must be a non-negative integer';
  END IF;

  UPDATE public.profiles
  SET
    extra_credits = COALESCE(extra_credits, 0) + words_to_add,
    updated_at    = NOW()
  WHERE id = user_id_input
  RETURNING COALESCE(extra_credits, 0) INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', user_id_input;
  END IF;

  RETURN new_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_extra_credits(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_extra_credits(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_extra_credits(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_extra_credits(uuid, integer) TO service_role;

-- ------------------------------------------------------------
-- subtract_extra_credits: used when a credit pack order is
-- refunded. Clamps at 0 so balances never go negative.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.subtract_extra_credits(
  user_id_input  uuid,
  words_to_remove integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  IF words_to_remove IS NULL OR words_to_remove < 0 THEN
    RAISE EXCEPTION 'words_to_remove must be a non-negative integer';
  END IF;

  UPDATE public.profiles
  SET
    extra_credits = GREATEST(COALESCE(extra_credits, 0) - words_to_remove, 0),
    updated_at    = NOW()
  WHERE id = user_id_input
  RETURNING COALESCE(extra_credits, 0) INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', user_id_input;
  END IF;

  RETURN new_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.subtract_extra_credits(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.subtract_extra_credits(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.subtract_extra_credits(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subtract_extra_credits(uuid, integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_profiles_extra_credits
  ON public.profiles(extra_credits);