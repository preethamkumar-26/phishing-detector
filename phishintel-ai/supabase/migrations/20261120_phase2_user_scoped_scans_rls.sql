-- ==============================================================================
-- Migration: PhishIntel Phase 2 User-Scoped Scans & Strict RLS
-- Target table: public.scans
-- Date: 2026-11-20
-- ==============================================================================

-- 1. Ensure user_id column exists and references auth.users(id)
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index for fast user scan queries sorted by creation time
CREATE INDEX IF NOT EXISTS scans_user_id_created_at_idx
  ON public.scans (user_id, created_at DESC);

-- 3. Enable Row Level Security (RLS) on public.scans
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- 4. Grant table privileges strictly to authenticated and service_role; revoke from anon
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.scans TO authenticated;
GRANT ALL ON TABLE public.scans TO service_role;
REVOKE ALL ON TABLE public.scans FROM anon;
REVOKE ALL ON TABLE public.scans FROM public;

-- 5. Drop any legacy or overly permissive policies (e.g. ones allowing null user_id to public)
DROP POLICY IF EXISTS "Allow all scan access" ON public.scans;
DROP POLICY IF EXISTS "scans_select_own" ON public.scans;
DROP POLICY IF EXISTS "scans_insert_own" ON public.scans;
DROP POLICY IF EXISTS "scans_update_own" ON public.scans;
DROP POLICY IF EXISTS "scans_delete_own" ON public.scans;
DROP POLICY IF EXISTS "scans_authenticated_select" ON public.scans;
DROP POLICY IF EXISTS "scans_authenticated_insert" ON public.scans;
DROP POLICY IF EXISTS "scans_authenticated_update" ON public.scans;
DROP POLICY IF EXISTS "scans_authenticated_delete" ON public.scans;

-- 6. Strict User Ownership Policies (auth.uid() = user_id)
-- Only authenticated users can SELECT their own scans
CREATE POLICY "scans_select_own"
  ON public.scans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only authenticated users can INSERT scans owned by themselves
CREATE POLICY "scans_insert_own"
  ON public.scans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can UPDATE their own scans, preserving ownership
CREATE POLICY "scans_update_own"
  ON public.scans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can DELETE their own scans
CREATE POLICY "scans_delete_own"
  ON public.scans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Legacy Data Isolation Note:
-- Any pre-existing rows where user_id IS NULL remain strictly inaccessible to normal users
-- because auth.uid() = user_id evaluates to NULL (false). They will not be leaked across users.
-- An administrator using service_role can audit, reassign, or purge legacy records if needed.
