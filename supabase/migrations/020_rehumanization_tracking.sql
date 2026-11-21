-- ============================================================
-- Migration 020: Track re-humanizations as separate history rows
-- ============================================================
-- Every re-humanization now inserts a new documents row instead of
-- overwriting the original. Two columns support this:
--
--   is_rehumanized      – true when this row was produced by clicking
--                         "Re-Humanize" on an existing document.
--   parent_document_id  – the id of the original document that was
--                         re-humanized (nullable; null for first-run rows).

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_rehumanized     boolean    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_document_id uuid       REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_parent_id
  ON public.documents(parent_document_id);
