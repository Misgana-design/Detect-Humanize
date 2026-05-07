-- Create detection_cache table for storing AI detection results
-- This table enables cost optimization by avoiding duplicate Gemini API calls
-- ARCHITECTURE DECISION: Using hash-based caching ensures identical texts
-- return cached results, significantly reducing API costs

CREATE TABLE IF NOT EXISTS detection_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash of the input text
  result JSONB NOT NULL, -- Structured AI detection result
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_detection_cache_hash ON detection_cache(hash);

-- Enable RLS (Row Level Security) for security
ALTER TABLE detection_cache ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read cache (for performance)
-- but only service roles can write (to prevent cache poisoning)
CREATE POLICY "Allow read access to all authenticated users" ON detection_cache
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow write access to service role only" ON detection_cache
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow update access to service role only" ON detection_cache
  FOR UPDATE USING (auth.role() = 'service_role');
