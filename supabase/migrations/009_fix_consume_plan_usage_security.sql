-- ============================================================
-- Migration 009: Fix consume_plan_usage security warnings
-- ============================================================
-- The function is called server-side via supabase.rpc() using the
-- service-role key, so it does NOT need to be callable by anon or
-- authenticated roles directly. We switch it to SECURITY INVOKER
-- and revoke public execute so it can only be called by the
-- server-side service role.
-- ============================================================

-- Drop and recreate as SECURITY INVOKER (no longer runs as owner)
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

-- Revoke execute from both anon and authenticated roles
-- The function is only called by the server via service-role key
REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) FROM PUBLIC;

-- Grant only to service_role (used by server-side Supabase client)
GRANT EXECUTE ON FUNCTION public.consume_plan_usage(uuid, integer) TO service_role;
