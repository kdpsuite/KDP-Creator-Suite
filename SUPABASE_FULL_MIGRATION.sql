-- ============================================================================
-- KDP Creator Suite: Full Supabase Migration
-- SAFE: Checks existence before creating. Never deletes or recreates.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- ============================================================================
-- 1. USER_PROFILES TABLE (should already exist)
-- ============================================================================

-- Add 2FA columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'totp_secret') THEN
        ALTER TABLE public.user_profiles ADD COLUMN totp_secret TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'totp_enabled') THEN
        ALTER TABLE public.user_profiles ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add subscription/usage columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.user_profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'conversions_this_month') THEN
        ALTER TABLE public.user_profiles ADD COLUMN conversions_this_month INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'batch_operations_this_month') THEN
        ALTER TABLE public.user_profiles ADD COLUMN batch_operations_this_month INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'last_usage_reset') THEN
        ALTER TABLE public.user_profiles ADD COLUMN last_usage_reset TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add reset_token columns if they don't exist (from earlier migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'reset_token') THEN
        ALTER TABLE public.user_profiles ADD COLUMN reset_token TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'reset_token_expires') THEN
        ALTER TABLE public.user_profiles ADD COLUMN reset_token_expires TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- 2. BATCH_JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.batch_jobs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    job_type TEXT NOT NULL CHECK (job_type IN ('convert_image', 'convert_pdf', 'validate')),
    total_files INTEGER NOT NULL DEFAULT 0,
    processed_files INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Add index on user_id for batch_jobs if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'batch_jobs' AND indexname = 'idx_batch_jobs_user_id') THEN
        CREATE INDEX idx_batch_jobs_user_id ON public.batch_jobs(user_id);
    END IF;
END $$;

-- ============================================================================
-- 3. TEMPLATES TABLE (user-saved formatting presets)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.templates (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trim_size TEXT NOT NULL,
    bleed TEXT NOT NULL DEFAULT 'bleed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'templates' AND indexname = 'idx_templates_user_id') THEN
        CREATE INDEX idx_templates_user_id ON public.templates(user_id);
    END IF;
END $$;

-- ============================================================================
-- 4. CREATED_ITEMS TABLE (tracks all generated files)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.created_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('coloring_page', 'kdp_formatted_pdf', 'compliance_report', 'batch_output')),
    original_filename TEXT,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    metadata JSONB DEFAULT '{}',
    batch_job_id BIGINT REFERENCES public.batch_jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'created_items' AND indexname = 'idx_created_items_user_id') THEN
        CREATE INDEX idx_created_items_user_id ON public.created_items(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'created_items' AND indexname = 'idx_created_items_type') THEN
        CREATE INDEX idx_created_items_type ON public.created_items(item_type);
    END IF;
END $$;

-- ============================================================================
-- 5. ANALYTICS_EVENTS TABLE (for chart data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('conversion', 'batch_operation', 'download', 'template_used')),
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'analytics_events' AND indexname = 'idx_analytics_events_user_id') THEN
        CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'analytics_events' AND indexname = 'idx_analytics_events_created_at') THEN
        CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
    END IF;
END $$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables (safe to call even if already enabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.created_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- user_profiles: users can only read/update their own profile
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'users_read_own_profile') THEN
        CREATE POLICY users_read_own_profile ON public.user_profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'users_update_own_profile') THEN
        CREATE POLICY users_update_own_profile ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- batch_jobs: users can only see/create/update their own jobs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'batch_jobs' AND policyname = 'users_read_own_jobs') THEN
        CREATE POLICY users_read_own_jobs ON public.batch_jobs FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'batch_jobs' AND policyname = 'users_insert_own_jobs') THEN
        CREATE POLICY users_insert_own_jobs ON public.batch_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'batch_jobs' AND policyname = 'users_update_own_jobs') THEN
        CREATE POLICY users_update_own_jobs ON public.batch_jobs FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- templates: users can only manage their own templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'users_read_own_templates') THEN
        CREATE POLICY users_read_own_templates ON public.templates FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'users_insert_own_templates') THEN
        CREATE POLICY users_insert_own_templates ON public.templates FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'users_delete_own_templates') THEN
        CREATE POLICY users_delete_own_templates ON public.templates FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- created_items: users can only see/create their own items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'created_items' AND policyname = 'users_read_own_items') THEN
        CREATE POLICY users_read_own_items ON public.created_items FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'created_items' AND policyname = 'users_insert_own_items') THEN
        CREATE POLICY users_insert_own_items ON public.created_items FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'created_items' AND policyname = 'users_delete_own_items') THEN
        CREATE POLICY users_delete_own_items ON public.created_items FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- analytics_events: users can only see their own events, insert their own
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'users_read_own_events') THEN
        CREATE POLICY users_read_own_events ON public.analytics_events FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'users_insert_own_events') THEN
        CREATE POLICY users_insert_own_events ON public.analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 7. STORAGE BUCKET FOR CREATED FILES
-- ============================================================================

-- Create the bucket (Supabase storage API — run via dashboard or use the SQL below)
-- Note: Storage bucket creation via SQL requires the storage schema
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'kdp-created-files', 'kdp-created-files', false, 52428800, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'kdp-created-files');

-- Storage RLS: users can only access their own folder (user_id as folder prefix)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'users_upload_own_files') THEN
        CREATE POLICY users_upload_own_files ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'kdp-created-files' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'users_read_own_files') THEN
        CREATE POLICY users_read_own_files ON storage.objects FOR SELECT
            USING (bucket_id = 'kdp-created-files' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'users_delete_own_files') THEN
        CREATE POLICY users_delete_own_files ON storage.objects FOR DELETE
            USING (bucket_id = 'kdp-created-files' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
END $$;

-- ============================================================================
-- DONE. Summary of what this migration creates/modifies:
-- 
-- MODIFIED (columns added if missing):
--   - user_profiles: totp_secret, totp_enabled, subscription_tier,
--     conversions_this_month, batch_operations_this_month, last_usage_reset,
--     reset_token, reset_token_expires
--
-- CREATED (if not exists):
--   - batch_jobs: tracks batch processing queue
--   - templates: user-saved formatting presets
--   - created_items: tracks all generated files with storage_path
--   - analytics_events: event log for charts and reporting
--   - Storage bucket: kdp-created-files (private, 50MB limit, PDF/image only)
--
-- RLS POLICIES (if not exists):
--   - All tables: users can only access their own rows
--   - Storage: users can only access files in their own folder
-- ============================================================================
