-- ============================================================
-- Fix Admin Login Issues
-- Run these statements ONE AT A TIME in Supabase SQL Editor
-- ============================================================

-- STEP 1: Check if your admin user exists and its status
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- STEP 2: If email_confirmed_at is NULL → run this to confirm it
-- Replace 'your-admin@email.com' with your actual admin email
-- ============================================================
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'your-admin@email.com'
  AND email_confirmed_at IS NULL;

-- ============================================================
-- STEP 3: Make sure the admin has role = 'admin' in user_metadata
-- Replace 'your-admin@email.com' with your actual admin email
-- ============================================================
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-admin@email.com';

-- ============================================================
-- STEP 4: Verify — re-run Step 1 to confirm changes
-- email_confirmed_at should now have a timestamp
-- raw_user_meta_data should include "role": "admin"
-- ============================================================
