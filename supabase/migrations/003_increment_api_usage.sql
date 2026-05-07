-- Create or replace the increment_api_usage function
-- This function safely increments the API usage counter for a user
-- ARCHITECTURE DECISION: Using RPC function ensures atomic operations
-- and prevents race conditions when updating usage counters

CREATE OR REPLACE FUNCTION increment_api_usage(user_id_input UUID)
RETURNS VOID AS $$
BEGIN
  -- Update the user's API usage count atomically
  -- If the profile doesn't exist, this will fail gracefully
  UPDATE profiles 
  SET api_usage_count = api_usage_count + 1,
      updated_at = NOW()
  WHERE id = user_id_input;
  
  -- If no rows were updated, the user might not have a profile
  -- This is handled at the application level
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_api_usage(UUID) TO authenticated;
