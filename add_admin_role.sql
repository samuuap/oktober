-- Add admin role to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Set yourself as admin (replace with your user_id)
-- Get your user_id from: Authentication > Users > copy UUID
UPDATE user_profiles
SET role = 'admin'
WHERE user_id = 'YOUR_USER_UUID_HERE';

-- Or by email:
UPDATE user_profiles
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'tu@email.com'
);
