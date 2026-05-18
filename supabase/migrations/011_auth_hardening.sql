-- ============================================================
-- Migration 011: Authentication and profile authorization hardening
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Keep browser clients from updating plan, billing, usage, or role fields
-- even though they are allowed to update their own profile row.
REVOKE UPDATE ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM PUBLIC;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;
