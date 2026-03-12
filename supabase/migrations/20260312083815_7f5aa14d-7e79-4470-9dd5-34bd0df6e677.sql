-- =====================================================
-- FIX 1: Audit log - remove anon access, scope to project members
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "audit_log_select_all" ON public.audit_log;

-- Create a proper policy: authenticated users can only read audit entries for their projects
CREATE POLICY "audit_log_select_project_member"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  project_id IS NOT NULL
  AND is_project_member(auth.uid(), project_id)
);

-- =====================================================
-- FIX 2: Profiles - prevent tenant_id self-modification
-- =====================================================

-- Drop the current permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate with WITH CHECK that blocks tenant_id changes
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id IS NOT DISTINCT FROM (SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid())
);