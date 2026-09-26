-- ============================================================
-- 1. CORRIGIR RLS auth_rls_initplan em worker_qualifications
--    Substituir auth.uid() por (select auth.uid()) para evitar
--    re-avaliação por cada linha (problema de performance)
-- ============================================================
DROP POLICY IF EXISTS "qual_select" ON public.worker_qualifications;
DROP POLICY IF EXISTS "qual_write"  ON public.worker_qualifications;

CREATE POLICY "qual_select" ON public.worker_qualifications
  FOR SELECT USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid()) AND pm.is_active = true
    )
  );

CREATE POLICY "qual_write" ON public.worker_qualifications
  FOR ALL USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.is_active = true
        AND pm.role IN ('admin','manager')
    )
  );

-- ============================================================
-- 2. ADICIONAR ÍNDICES EM FK SEM COBERTURA
--    topography_ft_points e worker_qualifications
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_topo_ft_points_control
  ON public.topography_ft_points (control_id);

CREATE INDEX IF NOT EXISTS idx_topo_ft_points_project
  ON public.topography_ft_points (project_id);

CREATE INDEX IF NOT EXISTS idx_worker_qual_worker_id
  ON public.worker_qualifications (worker_id)
  WHERE worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_worker_qual_created_by
  ON public.worker_qualifications (created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_integrations_created_by
  ON public.project_integrations (created_by)
  WHERE created_by IS NOT NULL;

-- ============================================================
-- 3. REMOVER ÍNDICES DUPLICADOS (mantém o mais descritivo)
--    12 pares duplicados identificados
-- ============================================================
-- materials: idx_materials_not_deleted duplica idx_materials_project
DROP INDEX IF EXISTS public.idx_materials_not_deleted;

-- non_conformities: idx_nc_work_item duplica nc_work_item_idx
DROP INDEX IF EXISTS public.idx_nc_work_item;

-- ppi_instances: idx_ppi_instances_project_id duplica idx_ppi_not_deleted
DROP INDEX IF EXISTS public.idx_ppi_not_deleted;

-- suppliers: idx_suppliers_not_deleted duplica idx_suppliers_project_id
DROP INDEX IF EXISTS public.idx_suppliers_not_deleted;

-- test_due_items: idx_test_due_plan_rule duplica idx_test_due_items_plan_rule
DROP INDEX IF EXISTS public.idx_test_due_plan_rule;

-- test_results: idx_test_results_not_deleted duplica idx_test_results_project_id
DROP INDEX IF EXISTS public.idx_test_results_not_deleted;

-- weld_records: idx_weld_records_pending_ut duplica idx_weld_records_result
-- Manter ambos porque são índices parciais com condições diferentes — não remover

-- work_items: idx_work_items_not_deleted duplica idx_work_items_project_id
DROP INDEX IF EXISTS public.idx_work_items_not_deleted;

-- project_invites: idx_project_invites_token duplica project_invites_token_key (unique)
-- Não remover — o unique constraint é diferente do índice parcial

-- ============================================================
-- 4. CORRIGIR POLÍTICAS MÚLTIPLAS PERMISSIVAS em worker_qualifications
--    A política qual_write abrange SELECT+ALL, o que duplica o SELECT
--    Separar em políticas específicas por operação
-- ============================================================
DROP POLICY IF EXISTS "qual_write" ON public.worker_qualifications;

-- Leitura: todos os membros do projecto
-- (já coberta pela qual_select acima)

-- Escrita: apenas admin e manager
CREATE POLICY "qual_insert" ON public.worker_qualifications
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.is_active = true
        AND pm.role IN ('admin','manager')
    )
  );

CREATE POLICY "qual_update" ON public.worker_qualifications
  FOR UPDATE USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.is_active = true
        AND pm.role IN ('admin','manager')
    )
  );

CREATE POLICY "qual_delete" ON public.worker_qualifications
  FOR DELETE USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.is_active = true
        AND pm.role IN ('admin','manager')
    )
  );
