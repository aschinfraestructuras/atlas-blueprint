-- 1. Adicionar is_deleted à planning_activities (faltava)
ALTER TABLE public.planning_activities
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- 2. Índices de performance — tabelas com is_deleted
CREATE INDEX IF NOT EXISTS idx_planning_act_not_deleted
  ON public.planning_activities (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_planning_act_code
  ON public.planning_activities (project_id, code)
  WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_materials_not_deleted
  ON public.materials (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_documents_not_deleted
  ON public.documents (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_test_results_not_deleted
  ON public.test_results (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_nc_not_deleted_status
  ON public.non_conformities (project_id, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_work_items_not_deleted
  ON public.work_items (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_ppi_wi_not_deleted
  ON public.ppi_instances (project_id, work_item_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_test_due_not_deleted
  ON public.test_due_items (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_notifications_proj_date
  ON public.notifications_log (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_module
  ON public.audit_log (project_id, module, created_at DESC);

-- 3. Corrigir o planningService — agora que is_deleted existe, a query já filtra
-- (o filtro .eq("is_deleted", false) foi adicionado pelo Claude no frontend)

-- 4. Corrigir RLS de project_integrations — múltiplas policies permissivas
-- Consolidar as 2 policies SELECT em 1
DROP POLICY IF EXISTS "project_integrations_admin" ON public.project_integrations;
DROP POLICY IF EXISTS "project_integrations_select" ON public.project_integrations;

CREATE POLICY "project_integrations_select" ON public.project_integrations
  FOR SELECT USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.is_active = true
    )
  );
