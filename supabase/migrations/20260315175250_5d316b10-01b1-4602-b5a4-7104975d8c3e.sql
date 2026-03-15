
-- ============================================================
-- Consolidate multiple permissive policies on projects, tenants, user_roles
-- Fixes 9 Supabase Performance Advisor warnings
-- ============================================================

-- === PROJECTS ===
DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
DROP POLICY IF EXISTS "projects_select_creator" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_tenant_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_creator" ON public.projects;
DROP POLICY IF EXISTS "projects_update_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_update_creator" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_tenant_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_creator" ON public.projects;

CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
  USING (
    public.is_project_member((SELECT auth.uid()), id)
    OR created_by = (SELECT auth.uid())
  );

CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR has_role((SELECT auth.uid()), 'tenant_admin')
    OR has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.is_project_admin((SELECT auth.uid()), id)
    OR has_role((SELECT auth.uid()), 'tenant_admin')
    OR has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR has_role((SELECT auth.uid()), 'tenant_admin')
    OR has_role((SELECT auth.uid()), 'super_admin')
  );

-- === TENANTS ===
DROP POLICY IF EXISTS "Super admins can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;

CREATE POLICY "tenants_select" ON public.tenants FOR SELECT TO authenticated
  USING (
    id = (SELECT tenant_id FROM public.profiles WHERE id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE POLICY "tenants_all_super_admin" ON public.tenants FOR ALL TO authenticated
  USING (has_role((SELECT auth.uid()), 'super_admin'))
  WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'));

-- === USER_ROLES ===
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Tenant admins can manage tenant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR has_role((SELECT auth.uid()), 'super_admin')
    OR has_role((SELECT auth.uid()), 'tenant_admin')
  );

CREATE POLICY "user_roles_manage" ON public.user_roles FOR ALL TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'super_admin')
    OR has_role((SELECT auth.uid()), 'tenant_admin')
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'super_admin')
    OR has_role((SELECT auth.uid()), 'tenant_admin')
  );
