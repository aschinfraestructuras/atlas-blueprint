
-- =============================================================================
-- Fix audit_log RLS — replace USING(true) with authenticated-user-scoped policies
-- The audit log must allow any authenticated user to INSERT (for logging),
-- but DELETE/UPDATE should be restricted to super_admin / tenant_admin only.
-- =============================================================================

DROP POLICY IF EXISTS audit_log_delete_all ON public.audit_log;
DROP POLICY IF EXISTS audit_log_insert_all ON public.audit_log;
DROP POLICY IF EXISTS audit_log_update_all ON public.audit_log;

-- INSERT: any authenticated user can write to audit log (needed for client-side logging)
CREATE POLICY audit_log_insert_authenticated ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: only super_admin / tenant_admin
CREATE POLICY audit_log_update_admin ON public.audit_log
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
  );

-- DELETE: only super_admin / tenant_admin
CREATE POLICY audit_log_delete_admin ON public.audit_log
  FOR DELETE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
  );
