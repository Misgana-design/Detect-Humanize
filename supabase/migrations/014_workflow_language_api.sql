-- Product workflow upgrades: language tagging, version snapshots, API keys,
-- and lightweight team records. Safe to run more than once.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS versions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.documents'::regclass
    AND conname = 'documents_tone_used_check';

  IF constraint_name IS NOT NULL THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_tone_used_check;
  END IF;
END $$;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_tone_used_check
  CHECK (
    tone_used IN (
      'analytical',
      'casual',
      'professional',
      'academic',
      'formal',
      'creative',
      'friendly',
      'storytelling'
    )
  );

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default key',
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own api keys" ON public.api_keys;
CREATE POLICY "Users can manage own api keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own teams" ON public.teams;
CREATE POLICY "Users can manage own teams"
ON public.teams
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can manage own team members" ON public.team_members;
CREATE POLICY "Users can manage own team members"
ON public.team_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
  )
);
