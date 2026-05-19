-- ============================================================
-- Migration 012: Replace the old "default" humanizer tone with "casual"
-- ============================================================

UPDATE public.documents
SET tone_used = 'casual'
WHERE tone_used = 'default';

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_tone_used_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_tone_used_check
  CHECK (tone_used IN (
    'casual', 'professional', 'academic', 'analytical',
    'formal', 'creative', 'friendly', 'storytelling'
  ));

