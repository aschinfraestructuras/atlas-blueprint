-- 1. Corrigir created_by do PF17A (estava null — bloqueia UPDATE por RLS)
UPDATE public.projects
SET created_by = '4d4bd489-7cbd-449e-af76-d10ab456d6a3'
WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND created_by IS NULL;

-- 2. Melhorar a RLS UPDATE para incluir membros admin do projecto
--    (a policy actual requer created_by OU is_project_admin — já cobrimos)
--    Verificar que is_project_admin usa (SELECT auth.uid()) para performance
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (
    (created_by = (SELECT auth.uid()))
    OR public.is_project_admin((SELECT auth.uid()), id)
    OR public.has_role((SELECT auth.uid()), 'tenant_admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

-- 3. Limpar projectos de teste criados (Aeroporto de Lisboa x2)
UPDATE public.projects
SET status = 'inactive'
WHERE name ILIKE '%aeroporto%'
  AND status != 'inactive';

-- Confirmar estado
SELECT id, name, status, created_by IS NOT NULL AS tem_criador
FROM public.projects
ORDER BY created_at;
