-- Supabase Migration Script: Password Reset Feature
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Add password reset columns to public.user_profiles
-- These columns will store the reset token and its expiration time
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'reset_token') THEN
        ALTER TABLE public.user_profiles ADD COLUMN reset_token TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'reset_token_expires') THEN
        ALTER TABLE public.user_profiles ADD COLUMN reset_token_expires TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Update existing users (optional)
-- All existing users will have NULL for these columns by default, which is correct.

-- 3. Verify the changes
-- You can run this query to check if the columns were added correctly:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'user_profiles'
-- AND column_name IN ('reset_token', 'reset_token_expires');

COMMENT ON COLUMN public.user_profiles.reset_token IS 'Cryptographically secure token for password reset flow';
COMMENT ON COLUMN public.user_profiles.reset_token_expires IS 'Expiration timestamp for the password reset token';
