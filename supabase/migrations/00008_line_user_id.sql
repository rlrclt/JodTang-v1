-- ============================================================
-- 8. Add line_user_id to profiles for LINE Messaging API
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);
