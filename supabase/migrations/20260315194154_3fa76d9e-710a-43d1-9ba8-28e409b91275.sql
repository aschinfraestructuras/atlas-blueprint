-- ============================================================
-- Fix: Multiple Permissive Policies on tenants & user_roles
-- Split FOR ALL into INSERT/UPDATE/DELETE to avoid SELECT overlap
-- ============================================================

-- ── TENANTS ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "tenants_manage" ON public.tenants;
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;

-- Single SELECT policy (no overlap)
CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'super_admin'::app_role)
  );

-- Super admin write policies
CREATE POLICY "tenants_insert" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'::app_role));

CREATE POLICY "tenants_update" ON public.tenants
  FOR UPDATE TO authenticated
  USING (has_role((SELECT auth.uid()), 'super_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'::app_role));

CREATE POLICY "tenants_delete" ON public.tenants
  FOR DELETE TO authenticated
  USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ── USER_ROLES ───────────────────────────────────────────────

DROP POLICY IF EXISTS "user_roles_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;

-- Single SELECT policy
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR has_role((SELECT auth.uid()), 'super_admin'::app_role)
    OR has_role((SELECT auth.uid()), 'tenant_admin'::app_role)
  );

-- Write policies with escalation protection
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role((SELECT auth.uid()), 'super_admin'::app_role)
    OR (
      has_role((SELECT auth.uid()), 'tenant_admin'::app_role)
      AND role NOT IN ('super_admin'::app_role, 'tenant_admin'::app_role)
    )
  );

CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'super_admin'::app_role)
    OR (
      has_role((SELECT auth.uid()), 'tenant_admin'::app_role)
      AND role NOT IN ('super_admin'::app_role, 'tenant_admin'::app_role)
    )
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'super_admin'::app_role)
    OR (
      has_role((SELECT auth.uid()), 'tenant_admin'::app_role)
      AND role NOT IN ('super_admin'::app_role, 'tenant_admin'::app_role)
    )
  );

CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'super_admin'::app_role)
    OR (
      has_role((SELECT auth.uid()), 'tenant_admin'::app_role)
      AND role NOT IN ('super_admin'::app_role, 'tenant_admin'::app_role)
    )
  );