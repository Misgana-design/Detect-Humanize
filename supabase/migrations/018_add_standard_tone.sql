-- ============================================================
-- Migration 018: Add 'standard' tone + clean up legacy values
-- ============================================================

-- 1. Normalise rows that carry values no longer valid:
--    'analytical' (old removed tone)  → 'professional'
--    'gptzero'    (detector target mistakenly stored as tone) → 'academic'
UPDATE public.documents SET tone_used = 'professional' WHERE tone_used = 'analytical';
UPDATE public.documents SET tone_used = 'academic'     WHERE tone_used = 'gptzero';

-- 2. Drop the old constraint (includes 'analytical', 'default', 'gptzero').
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_tone_used_check;

-- 3. Recreate with 'standard' added and legacy values removed.
ALTER TABLE public.documents
  ADD CONSTRAINT documents_tone_used_check
  CHECK (tone_used IN (
    'standard', 'casual', 'professional', 'academic',
    'formal', 'creative', 'friendly', 'storytelling'
  ));
