-- ============================================================
-- Migration 016: Add 'gptzero' to the tone_used constraint
-- ============================================================

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.documents'::regclass
    AND contype = 'c'
    AND conname = 'documents_tone_used_check';

  IF constraint_name IS NOT NULL THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_tone_used_check;
  END IF;
END $$;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_tone_used_check
  CHECK (tone_used IN (
    'casual', 'professional', 'academic', 'analytical',
    'formal', 'creative', 'friendly', 'storytelling',
    'gptzero', 'default'
  ));
