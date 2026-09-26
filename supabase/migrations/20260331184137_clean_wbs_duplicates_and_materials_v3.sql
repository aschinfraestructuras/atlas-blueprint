-- PASSO 1: Reatribuir actividade para nó na árvore correcta
UPDATE public.planning_activities
SET wbs_id = (
  SELECT w.id FROM public.planning_wbs w
  JOIN public.planning_wbs parent ON parent.id = w.parent_id
  WHERE w.wbs_code = '2.1'
    AND w.description = 'Escavação Geral'
    AND parent.parent_id = 'c55eabcd-7954-4c69-8f34-3581d47623d1'
  LIMIT 1
)
WHERE description = 'terraplen T1'
  AND project_id = 'aaaaaaaa-0001-0001-0001-000000000001';

-- PASSO 2: Eliminar 4 árvores WBS duplicadas
WITH RECURSIVE to_delete AS (
  SELECT id FROM public.planning_wbs
  WHERE id IN (
    '922a246d-778f-4adf-ab19-0d6fa6df4e31',
    '40b48a6a-72bf-454e-ac18-77a01bda73ad',
    '58f5b452-f2ea-49f0-bbcd-537ba5a366cb',
    '23e7b89a-503e-41c6-9f56-b3a9f0ba5582'
  )
  UNION ALL
  SELECT w.id FROM public.planning_wbs w
  JOIN to_delete td ON td.id = w.parent_id
)
DELETE FROM public.planning_wbs
WHERE id IN (SELECT id FROM to_delete);

-- PASSO 3: Materiais seed — "pending" → "archived" (catálogo pré-obra)
UPDATE public.materials
SET approval_status = 'archived'
WHERE project_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND approval_status = 'pending'
  AND created_at < '2026-03-20 00:00:00+00';
