-- Recria vistas sem usar fn_is_project_admin (que era SECURITY DEFINER)
DROP VIEW IF EXISTS public.vw_mqt_summary;
DROP VIEW IF EXISTS public.vw_mqt_items_safe;

-- Vista de itens com mascaramento de preço via subquery direta
CREATE VIEW public.vw_mqt_items_safe
WITH (security_invoker = true)
AS
SELECT
  m.id,
  m.project_id,
  m.code_rubrica,
  m.parent_code,
  m.nivel,
  m.familia,
  m.is_leaf,
  m.designacao,
  m.unidade,
  m.quantidade,
  m.prazo_garantia,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = m.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.is_active = true
      AND pm.role = 'admin'
  ) THEN m.preco_unitario ELSE NULL END AS preco_unitario,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = m.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.is_active = true
      AND pm.role = 'admin'
  ) THEN m.preco_total ELSE NULL END AS preco_total,
  m.pk_inicio_mqt,
  m.pk_fim_mqt,
  m.mqt_version,
  m.imported_at,
  m.imported_by,
  m.created_at,
  m.updated_at
FROM public.mqt_items m;

-- Vista de KPIs agregados
CREATE VIEW public.vw_mqt_summary
WITH (security_invoker = true)
AS
SELECT
  m.project_id,
  m.familia,
  COUNT(*) FILTER (WHERE m.is_leaf = true) AS total_itens_folha,
  COUNT(*) FILTER (WHERE m.is_leaf = true AND m.pk_inicio_mqt IS NOT NULL) AS itens_com_pk,
  SUM(m.quantidade) FILTER (WHERE m.is_leaf = true AND m.unidade ILIKE 'm³') AS volume_m3,
  SUM(m.quantidade) FILTER (WHERE m.is_leaf = true AND m.unidade ILIKE 'm²') AS area_m2,
  SUM(m.quantidade) FILTER (WHERE m.is_leaf = true AND m.unidade = 'm') AS comprimento_m,
  SUM(m.quantidade) FILTER (WHERE m.is_leaf = true AND m.unidade ILIKE 'un') AS unidades,
  SUM(m.quantidade) FILTER (WHERE m.is_leaf = true AND m.unidade ILIKE 'kg') AS peso_kg,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = m.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.is_active = true
      AND pm.role = 'admin'
  ) THEN SUM(m.preco_total) FILTER (WHERE m.is_leaf = true) ELSE NULL END AS valor_total_eur
FROM public.mqt_items m
GROUP BY m.project_id, m.familia;

-- Remove função helper (já não é usada pelas vistas)
DROP FUNCTION IF EXISTS public.fn_is_project_admin(UUID);

COMMENT ON VIEW public.vw_mqt_items_safe IS 'Vista pública dos itens MQT — preços ocultos para não-admins. Security invoker.';
COMMENT ON VIEW public.vw_mqt_summary IS 'Agregação por família (volume, área, comprimento) para KPIs do MQT. Security invoker.';