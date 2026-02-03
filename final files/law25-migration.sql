-- =====================================================
-- LAW 25 COMPLIANCE TABLES
-- Run this migration in your Supabase SQL Editor
-- =====================================================

-- 1. Access Logs (Article 8 - Track data access)
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g., 'DATA_EXPORT', 'ACCOUNT_DELETION_REQUESTED', 'LOGIN'
  resource TEXT, -- e.g., 'all_user_data', 'invoice:123', 'user_account'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

-- RLS: Users can only view their own logs
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access logs"
  ON access_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Admin policy (adjust role as needed)
CREATE POLICY "Service role can manage all logs"
  ON access_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================

-- 2. Deletion Queue (Article 28 - Right to Deletion)
CREATE TABLE IF NOT EXISTS deletion_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL, -- Date for hard deletion (30 days after request)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ
);

-- Index for scheduled job processing
CREATE INDEX idx_deletion_queue_scheduled ON deletion_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_deletion_queue_user_id ON deletion_queue(user_id);

-- RLS: Users can view their own deletion request
ALTER TABLE deletion_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion request"
  ON deletion_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage deletion queue"
  ON deletion_queue FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================

-- 3. Update Profiles Table (if not already present)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS privacy_consent_given BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_consent_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for filtering deleted accounts
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at);

-- =====================================================

-- 4. Automated Cleanup Function (run daily via cron)
-- This function hard-deletes accounts that have passed their grace period

CREATE OR REPLACE FUNCTION process_deletion_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Find accounts ready for hard deletion
  FOR rec IN 
    SELECT user_id 
    FROM deletion_queue
    WHERE status = 'pending'
      AND scheduled_for <= now()
  LOOP
    -- Hard delete all user data (cascade should handle related records)
    DELETE FROM profiles WHERE id = rec.user_id;
    
    -- Mark as completed
    UPDATE deletion_queue
    SET status = 'completed', completed_at = now()
    WHERE user_id = rec.user_id;
  END LOOP;
END;
$$;

-- =====================================================

-- 5. Scheduled Job (Supabase Edge Functions or pg_cron)
-- If using pg_cron extension (enable it first):
-- SELECT cron.schedule('process-deletion-queue', '0 2 * * *', 'SELECT process_deletion_queue()');

-- Alternatively, create a Supabase Edge Function that calls this daily

-- =====================================================

-- 6. Log Retention Policy (90 days)
-- Delete old access logs to comply with data minimization

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM access_logs
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- Schedule daily at 3am
-- SELECT cron.schedule('cleanup-old-logs', '0 3 * * *', 'SELECT cleanup_old_logs()');

-- =====================================================

-- 7. Verify Setup
SELECT 'Access Logs Table' AS table_name, COUNT(*) AS row_count FROM access_logs
UNION ALL
SELECT 'Deletion Queue', COUNT(*) FROM deletion_queue;

-- =====================================================
-- IMPORTANT: 
-- 1. Enable pg_cron extension in Supabase Dashboard → Database → Extensions
-- 2. Set up the scheduled jobs above
-- 3. Test the deletion flow in a staging environment first
-- =====================================================
