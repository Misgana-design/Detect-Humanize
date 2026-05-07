-- Consolidated repair migration for schema/RLS inconsistencies discovered after
-- multiple manual SQL runs. Safe to run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.humanization_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash text UNIQUE NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.detection_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash text UNIQUE NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.humanization_cache ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documents'
      AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documents'
      AND column_name = 'original_content'
  ) THEN
    ALTER TABLE public.documents RENAME COLUMN content TO original_content;
  END IF;
END $$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS original_content text,
  ADD COLUMN IF NOT EXISTS humanized_content text,
  ADD COLUMN IF NOT EXISTS tone_used text DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS title text DEFAULT 'Untitled Document';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_tone_used_check'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_tone_used_check
      CHECK (tone_used IN ('casual', 'professional', 'academic', 'analytical'));
  END IF;
END $$;

UPDATE public.documents
SET
  original_content = COALESCE(original_content, ''),
  title = COALESCE(title, 'Untitled Document'),
  tone_used = COALESCE(tone_used, 'professional')
WHERE original_content IS NULL
   OR title IS NULL
   OR tone_used IS NULL;

DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

CREATE POLICY "Users can view their own documents"
ON public.documents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.documents
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own detection_results" ON public.detection_results;
DROP POLICY IF EXISTS "Users can view own detection result" ON public.detection_results;
DROP POLICY IF EXISTS "Users can view own detection results only" ON public.detection_results;
DROP POLICY IF EXISTS "Users can insert own detection_results" ON public.detection_results;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.detection_results;

CREATE POLICY "Users can view own detection_results"
ON public.detection_results
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own detection_results"
ON public.detection_results
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can do everything on detection_cache" ON public.detection_cache;
DROP POLICY IF EXISTS "Service role can do everything on humanization_cache" ON public.humanization_cache;
DROP POLICY IF EXISTS "Authenticated users can read detection_cache" ON public.detection_cache;
DROP POLICY IF EXISTS "Authenticated users can write detection_cache" ON public.detection_cache;
DROP POLICY IF EXISTS "Authenticated users can update detection_cache" ON public.detection_cache;
DROP POLICY IF EXISTS "Authenticated users can read humanization_cache" ON public.humanization_cache;
DROP POLICY IF EXISTS "Authenticated users can write humanization_cache" ON public.humanization_cache;
DROP POLICY IF EXISTS "Authenticated users can update humanization_cache" ON public.humanization_cache;

CREATE POLICY "Authenticated users can read detection_cache"
ON public.detection_cache
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can write detection_cache"
ON public.detection_cache
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update detection_cache"
ON public.detection_cache
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can read humanization_cache"
ON public.humanization_cache
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can write humanization_cache"
ON public.humanization_cache
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update humanization_cache"
ON public.humanization_cache
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_documents_updated_at ON public.documents;
CREATE TRIGGER set_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.touch_documents_updated_at();
