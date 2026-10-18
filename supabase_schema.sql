-- ==============================================================================
-- TGPCOP MEDIA & FRESHER'S PARTY (PHASE 1) DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. Create config table (for countdown & dynamic announcements)
CREATE TABLE IF NOT EXISTS public.config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on config
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Config RLS: Public read, Admin write
DROP POLICY IF EXISTS "Public can read config" ON public.config;
CREATE POLICY "Public can read config" 
    ON public.config 
    FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Admin write config" ON public.config;
CREATE POLICY "Admin write config" 
    ON public.config 
    FOR ALL 
    TO authenticated 
    USING ((auth.jwt() ->> 'role') = 'service_role' OR (auth.jwt() ->> 'email') LIKE '%admin%')
    WITH CHECK ((auth.jwt() ->> 'role') = 'service_role' OR (auth.jwt() ->> 'email') LIKE '%admin%');

-- Seed initial countdown and date reveal configuration
INSERT INTO public.config (key, value)
VALUES 
    ('reveal_at', '2026-11-01T10:00:00+05:30'),
    ('event_date', 'DATE TO BE ANNOUNCED')
ON CONFLICT (key) DO NOTHING;


-- 2. Create registrations table for Fresher's Party
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) >= 2),
    email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
    batch INTEGER NOT NULL CHECK (batch IN (2023, 2024, 2025, 2026)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on registrations
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Registrations RLS: Users can only insert and read their own registration
DROP POLICY IF EXISTS "Users can insert their own registration" ON public.registrations;
CREATE POLICY "Users can insert their own registration"
    ON public.registrations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own registration" ON public.registrations;
CREATE POLICY "Users can view their own registration"
    ON public.registrations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Speed indexes
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations(email);


-- 3. Create media_collaborations table for TGPCOP Media coverage & design requests
CREATE TABLE IF NOT EXISTS public.media_collaborations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on media_collaborations
ALTER TABLE public.media_collaborations ENABLE ROW LEVEL SECURITY;

-- Collaborations RLS: Anyone can submit a collaboration request
DROP POLICY IF EXISTS "Anyone can submit collaboration" ON public.media_collaborations;
CREATE POLICY "Anyone can submit collaboration"
    ON public.media_collaborations
    FOR INSERT
    WITH CHECK (true);

-- Only admins / service-role can view collaboration inquiries
DROP POLICY IF EXISTS "Admins can view collaborations" ON public.media_collaborations;
CREATE POLICY "Admins can view collaborations"
    ON public.media_collaborations
    FOR SELECT
    TO authenticated
    USING ((auth.jwt() ->> 'role') = 'service_role' OR (auth.jwt() ->> 'email') LIKE '%admin%');
