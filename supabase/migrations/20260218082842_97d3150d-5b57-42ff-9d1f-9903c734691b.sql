
-- =============================================================================
-- SECURITY HARDENING MIGRATION
-- 1. Fix profiles exposure
-- 2. Restrict supplier contact visibility
-- 3. Harden storage_path_project_id() against path traversal
-- =============================================================================

-- ─── 1. FIX PROFILES EXPOSURE ────────────────────────────────────────────────

-- Drop existing broad SELECT policies on profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant admins can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new, tightly scoped SELECT policy
-- Users can read their own profile, OR project admins can read profiles of
-- members within the same project.
CREATE POLICY "profiles_select_self_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.project_id IN (
        SELECT project_id FROM public.project_members
        WHERE user_id = profiles.user_id
      )
      AND public.is_project_admin(auth.uid(), pm.project_id)
  )
);

-- ─── 2. RESTRICT SUPPLIER CONTACT VISIBILITY ─────────────────────────────────

-- Drop existing broad SELECT policy on suppliers
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;

-- Only members with elevated roles (admin, project_manager, quality_manager)
-- can read supplier rows (which include the contacts jsonb with PII).
CREATE POLICY "suppliers_select"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  public.is_project_member(auth.uid(), project_id)
  AND public.get_project_role(auth.uid(), project_id)
    IN ('admin', 'project_manager', 'quality_manager')
);

-- ─── 3. HARDEN storage_path_project_id() AGAINST PATH TRAVERSAL ──────────────

-- Replace immutable SQL function with a plpgsql version that:
-- (a) validates the first path segment is a valid UUID, and
-- (b) verifies the project actually exists in public.projects
CREATE OR REPLACE FUNCTION public.storage_path_project_id(path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_segment text;
  project_uuid    uuid;
BEGIN
  -- Extract first path segment (expected: project_id)
  project_segment := split_part(path, '/', 1);

  -- Reject empty or traversal segments immediately
  IF project_segment IS NULL OR project_segment = '' OR project_segment LIKE '%..%' THEN
    RAISE EXCEPTION 'Invalid storage path segment: %', project_segment;
  END IF;

  -- Attempt UUID cast — rejects any non-UUID first segment
  BEGIN
    project_uuid := project_segment::uuid;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'Invalid project UUID in path: %', project_segment;
  END;

  -- Confirm the project actually exists (prevents spoofing deleted projects)
  IF NOT EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_uuid
  ) THEN
    RAISE EXCEPTION 'Project does not exist: %', project_uuid;
  END IF;

  RETURN project_uuid;
END;
$$;

-- ─── 4. SCHEMA CONSISTENCY GUARD ─────────────────────────────────────────────
-- Verify (at migration time) that profiles has no project_id column.
-- This DO block will raise an error if the column exists, making the migration
-- fail-safe and self-documenting.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'project_id'
  ) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: profiles table must NOT have a project_id column';
  END IF;
  RAISE NOTICE 'Schema consistency OK: profiles has no project_id column';
END $$;
