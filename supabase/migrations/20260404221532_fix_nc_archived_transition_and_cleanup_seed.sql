-- ============================================================
-- 1. CORRIGIR: NC em estado "archived" não pode voltar a "open"
--    na UI aparece "transição inválida archived → open"
--    porque a função permite mas o frontend não apresenta o botão
--    A BD está correcta: archived → open É permitido (para reabrir)
--    O problema é no frontend — não há nada a corrigir na BD aqui
-- ============================================================

-- 2. LIMPAR: a NC real (não seed) está em "archived" com is_deleted=false
--    Isso significa que foi arquivada manualmente — estado válido
--    Nada a alterar

-- 3. LIMPAR: ensaios agendados seed que não têm betão real
--    Os 4 test_due_items são seed de demonstração
--    Os 2 de betão (ENS-BET-001) devem ser marcados is_deleted
--    pois não há concrete_batches nem concrete_lots no projecto
UPDATE public.test_due_items
SET is_deleted = true,
    deleted_at = now()
WHERE project_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND plan_rule_id IN (
    SELECT tpr.id FROM public.test_plan_rules tpr
    JOIN public.tests_catalog tc ON tc.id = tpr.test_id
    WHERE tc.code = 'ENS-BET-001'
      AND tc.project_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  );

-- 4. CORRIGIR: RLS performance em topography_ft_points
--    já foi corrigido antes mas voltou — re-aplicar
DROP POLICY IF EXISTS "Members can view FT points" ON public.topography_ft_points;
DROP POLICY IF EXISTS "Members can insert FT points" ON public.topography_ft_points;
DROP POLICY IF EXISTS "Members can update FT points" ON public.topography_ft_points;
DROP POLICY IF EXISTS "Members can delete FT points" ON public.topography_ft_points;

CREATE POLICY "ft_points_select" ON public.topography_ft_points
  FOR SELECT USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid()) AND pm.is_active = true
    )
  );

CREATE POLICY "ft_points_insert" ON public.topography_ft_points
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid()) AND pm.is_active = true
    )
  );

CREATE POLICY "ft_points_update" ON public.topography_ft_points
  FOR UPDATE USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid()) AND pm.is_active = true
    )
  );

CREATE POLICY "ft_points_delete" ON public.topography_ft_points
  FOR DELETE USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = (SELECT auth.uid()) AND pm.is_active = true
    )
  );
