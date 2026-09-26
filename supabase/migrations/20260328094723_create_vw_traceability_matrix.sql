-- View de rastreabilidade correcta
-- Corrige os erros do traceabilityService:
-- 1. usa supplier_materials (não material_suppliers que não existe)
-- 2. usa work_items.sector/parte/elemento (não code/name que não existem)
-- 3. inclui lotes, ensaios físicos e NCs
CREATE OR REPLACE VIEW public.vw_traceability_matrix
WITH (security_invoker = true)
AS
SELECT
  m.project_id,
  m.id                    AS material_id,
  m.code                  AS material_code,
  m.name                  AS material_name,
  m.category              AS material_category,
  m.status                AS material_status,
  m.pame_status,
  m.approval_status       AS material_approval,

  -- Fornecedor (via supplier_materials — tabela correcta)
  s.id                    AS supplier_id,
  s.name                  AS supplier_name,
  s.code                  AS supplier_code,
  s.qualification_status  AS supplier_qual,

  -- Lote mais recente
  ml.id                   AS lot_id,
  ml.lot_code,
  ml.reception_date,
  ml.reception_status     AS lot_status,
  ml.ce_marking_ok        AS lot_ce,
  ml.quantity_received    AS lot_qty,
  ml.unit                 AS lot_unit,

  -- Work Item associado
  wi.id                   AS work_item_id,
  wi.sector               AS wi_sector,
  wi.parte                AS wi_parte,
  wi.elemento             AS wi_elemento,
  wi.disciplina           AS wi_disciplina,
  wi.status               AS wi_status,
  wi.readiness_status     AS wi_readiness,

  -- PPI do work item
  pi.id                   AS ppi_id,
  pi.code                 AS ppi_code,
  pi.status               AS ppi_status,

  -- Contadores de qualidade
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false)                              AS nc_total,
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false AND nc.status NOT IN ('closed','archived')) AS nc_open,

  -- Ensaios de betão ligados
  COUNT(DISTINCT cb.id)   AS concrete_batches,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.strength_mpa IS NOT NULL) AS concrete_tested,

  -- Data de criação do material
  m.created_at            AS material_created_at

FROM public.materials m
-- Fornecedor via tabela correcta supplier_materials
LEFT JOIN public.supplier_materials sm ON sm.material_id = m.id
LEFT JOIN public.suppliers s ON s.id = sm.supplier_id AND s.is_deleted = false
-- Lote mais recente
LEFT JOIN LATERAL (
  SELECT * FROM public.material_lots ml2
  WHERE ml2.material_id = m.id AND ml2.is_deleted = false
  ORDER BY ml2.reception_date DESC NULLS LAST
  LIMIT 1
) ml ON true
-- Work item via ligação directa
LEFT JOIN public.work_item_materials wim ON wim.material_id = m.id
LEFT JOIN public.work_items wi ON wi.id = wim.work_item_id AND wi.is_deleted = false
-- PPI do work item
LEFT JOIN LATERAL (
  SELECT * FROM public.ppi_instances pi2
  WHERE pi2.work_item_id = wi.id AND pi2.is_deleted = false
  ORDER BY pi2.created_at DESC NULLS LAST
  LIMIT 1
) pi ON true
-- NCs ligadas ao material
LEFT JOIN public.non_conformities nc ON nc.material_id = m.id
-- Betão ligado ao work item
LEFT JOIN public.concrete_batches cb ON cb.work_item_id = wi.id
LEFT JOIN public.concrete_specimens cs ON cs.batch_id = cb.id

WHERE m.is_deleted = false

GROUP BY
  m.project_id, m.id, m.code, m.name, m.category, m.status,
  m.pame_status, m.approval_status, m.created_at,
  s.id, s.name, s.code, s.qualification_status,
  ml.id, ml.lot_code, ml.reception_date, ml.reception_status,
  ml.ce_marking_ok, ml.quantity_received, ml.unit,
  wi.id, wi.sector, wi.parte, wi.elemento,
  wi.disciplina, wi.status, wi.readiness_status,
  pi.id, pi.code, pi.status
ORDER BY m.code;
