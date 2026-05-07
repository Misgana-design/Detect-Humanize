-- Ensure profiles table has the required columns for API usage tracking
-- This migration adds or updates the necessary columns for rate limiting

-- Add subscription_tier column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' 
    CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));
  END IF;
END $$;

-- Add api_usage_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'api_usage_count') THEN
    ALTER TABLE profiles ADD COLUMN api_usage_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_api_usage_count ON profiles(api_usage_count);
