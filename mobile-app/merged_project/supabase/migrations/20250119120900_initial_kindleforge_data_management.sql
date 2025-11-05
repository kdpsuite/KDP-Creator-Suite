-- KindleForge Data Management Module Migration
-- Creates core tables for user authentication, project management, and conversion tracking

-- 1. Types and Enums
CREATE TYPE public.user_role AS ENUM ('admin', 'premium', 'free');
CREATE TYPE public.project_status AS ENUM ('draft', 'processing', 'completed', 'failed', 'archived');
CREATE TYPE public.format_type AS ENUM ('ebook', 'paperback', 'hardcover', 'coloring_book', 'kindle_direct');
CREATE TYPE public.conversion_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
CREATE TYPE public.file_type AS ENUM ('pdf', 'epub', 'mobi', 'azw3', 'docx');

-- 2. User Profiles (Critical intermediary table)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'free'::public.user_role,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    storage_used_mb INTEGER DEFAULT 0,
    storage_limit_mb INTEGER DEFAULT 500,
    projects_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Projects Table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    original_pdf_url TEXT,
    original_pdf_name TEXT,
    thumbnail_url TEXT,
    status public.project_status DEFAULT 'draft'::public.project_status,
    total_pages INTEGER DEFAULT 0,
    file_size_mb DECIMAL(10,2) DEFAULT 0,
    is_favorite BOOLEAN DEFAULT false,
    folder_path TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Format Conversions Table
CREATE TABLE public.format_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    format_type public.format_type NOT NULL,
    status public.conversion_status DEFAULT 'pending'::public.conversion_status,
    output_file_url TEXT,
    output_file_size_mb DECIMAL(10,2),
    conversion_settings JSONB DEFAULT '{}',
    error_message TEXT,
    conversion_started_at TIMESTAMPTZ,
    conversion_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Sharing and Publishing Table
CREATE TABLE public.project_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    share_type TEXT NOT NULL, -- 'google_drive', 'email', 'kdp', 'direct_link'
    share_url TEXT,
    recipient_email TEXT,
    kdp_asin TEXT,
    share_settings JSONB DEFAULT '{}',
    shared_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

-- 6. Usage Analytics Table
CREATE TABLE public.usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'pdf_upload', 'conversion_start', 'conversion_complete', 'share', 'download'
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Essential Indexes
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX idx_format_conversions_project_id ON public.format_conversions(project_id);
CREATE INDEX idx_format_conversions_status ON public.format_conversions(status);
CREATE INDEX idx_project_shares_project_id ON public.project_shares(project_id);
CREATE INDEX idx_usage_analytics_user_id ON public.usage_analytics(user_id);

-- 8. Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.format_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

-- 9. Helper Functions for RLS Policies
CREATE OR REPLACE FUNCTION public.is_project_owner(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_uuid AND p.user_id = auth.uid()
)
$$;

CREATE OR REPLACE FUNCTION public.can_access_conversion(conversion_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.format_conversions fc
    JOIN public.projects p ON fc.project_id = p.id
    WHERE fc.id = conversion_uuid AND p.user_id = auth.uid()
)
$$;

CREATE OR REPLACE FUNCTION public.can_access_share(share_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.project_shares ps
    JOIN public.projects p ON ps.project_id = p.id
    WHERE ps.id = share_uuid AND p.user_id = auth.uid()
)
$$;

CREATE OR REPLACE FUNCTION public.has_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'admin'::public.user_role
)
$$;

-- 10. RLS Policies
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_manage_own_projects"
ON public.projects
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_access_own_conversions"
ON public.format_conversions
FOR ALL
TO authenticated
USING (public.can_access_conversion(id))
WITH CHECK (public.can_access_conversion(id));

CREATE POLICY "users_manage_own_shares"
ON public.project_shares
FOR ALL
TO authenticated
USING (public.can_access_share(id))
WITH CHECK (public.can_access_share(id));

CREATE POLICY "users_view_own_analytics"
ON public.usage_analytics
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_analytics"
ON public.usage_analytics
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admin access policies
CREATE POLICY "admin_full_access_projects"
ON public.projects
FOR ALL
TO authenticated
USING (public.has_admin_role())
WITH CHECK (public.has_admin_role());

CREATE POLICY "admin_view_all_analytics"
ON public.usage_analytics
FOR SELECT
TO authenticated
USING (public.has_admin_role());

-- 11. Functions for Automatic Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'free')::public.user_role
  );
  RETURN NEW;
END;
$$;

-- 12. Trigger for New User Creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Functions for Updated Timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_format_conversions_updated_at
    BEFORE UPDATE ON public.format_conversions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Sample Data
DO $$
DECLARE
    demo_user_id UUID := gen_random_uuid();
    premium_user_id UUID := gen_random_uuid();
    project1_id UUID := gen_random_uuid();
    project2_id UUID := gen_random_uuid();
    project3_id UUID := gen_random_uuid();
BEGIN
    -- Create demo auth users
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (demo_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'demo@kindleforge.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Demo User"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (premium_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'premium@kindleforge.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Premium User"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Sample projects
    INSERT INTO public.projects (id, user_id, name, description, status, total_pages, file_size_mb, thumbnail_url)
    VALUES
        (project1_id, demo_user_id, 'Children''s Adventure Story', 
         'A magical adventure story for children aged 5-8', 
         'completed'::public.project_status, 24, 2.4,
         'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400'),
        (project2_id, demo_user_id, 'Cooking Recipe Collection', 
         'Traditional family recipes compiled into a cookbook', 
         'processing'::public.project_status, 156, 8.7,
         'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400'),
        (project3_id, premium_user_id, 'Animal Coloring Book', 
         'Fun animal illustrations for kids to color', 
         'completed'::public.project_status, 32, 15.2,
         'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=400');

    -- Sample format conversions
    INSERT INTO public.format_conversions (project_id, format_type, status, output_file_size_mb)
    VALUES
        (project1_id, 'ebook'::public.format_type, 'completed'::public.conversion_status, 2.1),
        (project1_id, 'kindle_direct'::public.format_type, 'completed'::public.conversion_status, 2.3),
        (project2_id, 'paperback'::public.format_type, 'in_progress'::public.conversion_status, null),
        (project3_id, 'coloring_book'::public.format_type, 'completed'::public.conversion_status, 14.8);

    -- Sample usage analytics
    INSERT INTO public.usage_analytics (user_id, action_type, project_id, metadata)
    VALUES
        (demo_user_id, 'pdf_upload', project1_id, '{"original_size_mb": 2.8}'::jsonb),
        (demo_user_id, 'conversion_complete', project1_id, '{"format": "ebook", "duration_seconds": 45}'::jsonb),
        (premium_user_id, 'pdf_upload', project3_id, '{"original_size_mb": 16.1}'::jsonb);

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error during sample data creation: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error during sample data creation: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error during sample data creation: %', SQLERRM;
END $$;

-- 15. Cleanup Function
CREATE OR REPLACE FUNCTION public.cleanup_demo_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    demo_user_ids UUID[];
BEGIN
    -- Get demo user IDs
    SELECT ARRAY_AGG(id) INTO demo_user_ids
    FROM auth.users
    WHERE email LIKE '%@kindleforge.com';

    -- Delete in dependency order
    DELETE FROM public.usage_analytics WHERE user_id = ANY(demo_user_ids);
    DELETE FROM public.project_shares WHERE project_id IN (
        SELECT id FROM public.projects WHERE user_id = ANY(demo_user_ids)
    );
    DELETE FROM public.format_conversions WHERE project_id IN (
        SELECT id FROM public.projects WHERE user_id = ANY(demo_user_ids)
    );
    DELETE FROM public.projects WHERE user_id = ANY(demo_user_ids);
    DELETE FROM public.user_profiles WHERE id = ANY(demo_user_ids);
    DELETE FROM auth.users WHERE id = ANY(demo_user_ids);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Cleanup failed: %', SQLERRM;
END;
$$;