-- PART 1: Fix privilege escalation — prevent tenant_admin from granting super_admin
DROP POLICY IF EXISTS "user_roles_manage" ON public.user_roles;

CREATE POLICY "user_roles_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'super_admin')
    OR (
      has_role((SELECT auth.uid()), 'tenant_admin')
      AND role NOT IN ('super_admin', 'tenant_admin')
    )
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'super_admin')
    OR (
      has_role((SELECT auth.uid()), 'tenant_admin')
      AND role NOT IN ('super_admin', 'tenant_admin')
    )
  );

-- PART 2: Add security_invoker = true to all public views
ALTER VIEW public.view_advanced_quality_metrics SET (security_invoker = on);
ALTER VIEW public.view_dashboard_summary SET (security_invoker = on);
ALTER VIEW public.view_document_metrics SET (security_invoker = on);
ALTER VIEW public.view_material_detail_metrics SET (security_invoker = on);
ALTER VIEW public.view_materials_kpi SET (security_invoker = on);
ALTER VIEW public.view_nc_monthly SET (security_invoker = on);
ALTER VIEW public.view_supplier_detail_metrics SET (security_invoker = on);
ALTER VIEW public.view_suppliers_kpi SET (security_invoker = on);
ALTER VIEW public.view_tests_monthly SET (security_invoker = on);
ALTER VIEW public.vw_audit_log SET (security_invoker = on);
ALTER VIEW public.vw_deadlines SET (security_invoker = on);
ALTER VIEW public.vw_ppi_kpis SET (security_invoker = on);
ALTER VIEW public.vw_project_health SET (security_invoker = on);
ALTER VIEW public.vw_work_items_summary SET (security_invoker = on);