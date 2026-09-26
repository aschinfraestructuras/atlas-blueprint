-- ═══════════════════════════════════════════════════════════════════
-- 1. Limpar notificações antigas (todas de teste — tabela estava vazia)
-- ═══════════════════════════════════════════════════════════════════
TRUNCATE TABLE notifications RESTART IDENTITY;
TRUNCATE TABLE notification_rate_limits RESTART IDENTITY;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Corrigir vw_deadlines — excluir entidades pai apagadas
--    subcontractor_docs de subcontratados apagados
--    supplier_docs de suppliers apagados
--    planning_activities de teste (título "teste wbs")
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.vw_deadlines AS

-- Documentos de fornecedores (só se fornecedor não apagado)
SELECT
  sd.project_id, sd.id,
  'supplier_doc'::text AS source,
  sd.doc_type AS doc_name,
  sd.valid_to AS due_date,
  sd.valid_to - CURRENT_DATE AS days_remaining,
  CASE
    WHEN sd.valid_to < CURRENT_DATE THEN 'critical'
    WHEN sd.valid_to <= (CURRENT_DATE + 7) THEN 'critical'
    WHEN sd.valid_to <= (CURRENT_DATE + 30) THEN 'warning'
    ELSE 'info'
  END AS severity,
  sd.supplier_id AS related_id
FROM supplier_documents sd
JOIN suppliers s ON s.id = sd.supplier_id AND s.is_deleted = false
WHERE sd.status NOT IN ('expired','archived')
  AND sd.valid_to IS NOT NULL

UNION ALL

-- Documentos de materiais
SELECT
  md.project_id, md.id,
  'material_doc'::text AS source,
  md.doc_type AS doc_name,
  md.valid_to AS due_date,
  md.valid_to - CURRENT_DATE AS days_remaining,
  CASE
    WHEN md.valid_to < CURRENT_DATE THEN 'critical'
    WHEN md.valid_to <= (CURRENT_DATE + 7) THEN 'critical'
    WHEN md.valid_to <= (CURRENT_DATE + 30) THEN 'warning'
    ELSE 'info'
  END AS severity,
  md.material_id AS related_id
FROM material_documents md
JOIN materials m ON m.id = md.material_id AND m.is_deleted = false
WHERE md.valid_to IS NOT NULL

UNION ALL

-- Calibrações de equipamentos topográficos
SELECT
  te.project_id, te.id,
  'calibration'::text AS source,
  te.equipment_type AS doc_name,
  te.calibration_valid_until AS due_date,
  te.calibration_valid_until - CURRENT_DATE AS days_remaining,
  CASE
    WHEN te.calibration_valid_until < CURRENT_DATE THEN 'critical'
    WHEN te.calibration_valid_until <= (CURRENT_DATE + 7) THEN 'critical'
    WHEN te.calibration_valid_until <= (CURRENT_DATE + 30) THEN 'warning'
    ELSE 'info'
  END AS severity,
  NULL::uuid AS related_id
FROM topography_equipment te
WHERE te.calibration_valid_until IS NOT NULL

UNION ALL

-- NCs com prazo (só activas)
SELECT
  nc.project_id, nc.id,
  'nc_due'::text AS source,
  nc.code AS doc_name,
  nc.due_date,
  nc.due_date - CURRENT_DATE AS days_remaining,
  CASE
    WHEN nc.due_date < CURRENT_DATE THEN 'critical'
    WHEN nc.due_date <= (CURRENT_DATE + 7) THEN 'critical'
    WHEN nc.due_date <= (CURRENT_DATE + 30) THEN 'warning'
    ELSE 'info'
  END AS severity,
  NULL::uuid AS related_id
FROM non_conformities nc
WHERE nc.status IN ('open','in_progress')
  AND nc.due_date IS NOT NULL
  AND nc.is_deleted = false

UNION ALL

-- RFIs com prazo (só activos)
SELECT
  r.project_id, r.id,
  'rfi_due'::text AS source,
  r.subject AS doc_name,
  r.deadline AS due_date,
  r.deadline - CURRENT_DATE AS days_remaining,
  CASE
    WHEN r.deadline < CURRENT_DATE THEN 'critical'
    WHEN r.deadline <= (CURRENT_DATE + 7) THEN 'critical'
    WHEN r.deadline <= (CURRENT_DATE + 30) THEN 'warning'
    ELSE 'info'
  END AS severity,
  NULL::uuid AS related_id
FROM rfis r
WHERE r.status IN ('open','in_progress')
  AND r.deadline IS NOT NULL
  AND r.is_deleted = false

UNION ALL

-- Escritório técnico com prazo (só activos e não apagados)
SELECT
  toi.project_id, toi.id,
  'tech_office_due'::text AS source,
  toi.title AS doc_name,
  toi.due_date,
  toi.due_date - CURRENT_DATE AS days_remaining,
  CASE
    WHEN toi.due_date < CURRENT_DATE THEN 'critical'
    WHEN toi.due_date <= (CURRENT_DATE + 7) THEN 'critical'
    WHEN toi.due_date <= (CURRENT_DATE + 30) THEN 'warning'
    ELSE 'info'
  END AS severity,
  NULL::uuid AS related_id
FROM technical_office_items toi
WHERE toi.status IN ('open','in_progress')
  AND toi.due_date IS NOT NULL
  AND (toi.is_deleted = false OR toi.is_deleted IS NULL)

UNION ALL

-- Actividades de planeamento com prazo (só activas e não apagadas)
SELECT
  pa.project_id, pa.id,
  'planning_due'::text AS source,
  pa.description AS doc_name,
  pa.planned_end AS due_date,
  pa.planned_end - CURRENT_DATE AS days_remaining,
  CASE
    WHEN pa.planned_end < CURRENT_DATE THEN 'critical'
    WHEN pa.planned_end <= (CURRENT_DATE + 7) THEN 'critical'
    WHEN pa.planned_end <= (CURRENT_DATE + 30) THEN 'warning'
    ELSE 'info'
  END AS severity,
  NULL::uuid AS related_id
FROM planning_activities pa
WHERE pa.status NOT IN ('completed','cancelled')
  AND pa.planned_end IS NOT NULL
  AND (pa.is_deleted = false OR pa.is_deleted IS NULL)

UNION ALL

-- PPIs pendentes (só activos)
SELECT
  pi.project_id, pi.id,
  'ppi_pending'::text AS source,
  pi.code AS doc_name,
  (COALESCE(pi.opened_at, pi.created_at) + INTERVAL '14 days')::date AS due_date,
  COALESCE(pi.opened_at, pi.created_at)::date + 14 - CURRENT_DATE AS days_remaining,
  CASE
    WHEN CURRENT_DATE > (COALESCE(pi.opened_at, pi.created_at)::date + 14) THEN 'critical'
    WHEN CURRENT_DATE > (COALESCE(pi.opened_at, pi.created_at)::date + 7) THEN 'warning'
    ELSE 'info'
  END AS severity,
  NULL::uuid AS related_id
FROM ppi_instances pi
WHERE pi.status IN ('draft','in_progress')
  AND pi.is_deleted = false

UNION ALL

-- Lotes em quarentena (só activos)
SELECT
  ml.project_id, ml.id,
  'quarantine_lot'::text AS source,
  ml.lot_code AS doc_name,
  (ml.reception_date + INTERVAL '2 days')::date AS due_date,
  ml.reception_date + 2 - CURRENT_DATE AS days_remaining,
  CASE
    WHEN CURRENT_DATE > (ml.reception_date + 2) THEN 'critical'
    ELSE 'warning'
  END AS severity,
  ml.material_id AS related_id
FROM material_lots ml
WHERE ml.reception_status = 'quarantine'
  AND ml.is_deleted = false

UNION ALL

-- Documentos de subcontratados (só se subcontratado não apagado)
SELECT
  subdoc.project_id, subdoc.id,
  'subcontractor_doc'::text AS source,
  subdoc.doc_type AS doc_name,
  subdoc.valid_to AS due_date,
  subdoc.valid_to - CURRENT_DATE AS days_remaining,
  CASE
    WHEN subdoc.valid_to < CURRENT_DATE THEN 'critical'
    WHEN subdoc.valid_to <= (CURRENT_DATE + 7) THEN 'critical'
    WHEN subdoc.valid_to <= (CURRENT_DATE + 30) THEN 'warning'
    ELSE 'info'
  END AS severity,
  subdoc.subcontractor_id AS related_id
FROM subcontractor_documents subdoc
JOIN subcontractors sc ON sc.id = subdoc.subcontractor_id AND sc.is_deleted = false
WHERE subdoc.status NOT IN ('expired','archived')
  AND subdoc.valid_to IS NOT NULL;

-- Grant acesso à view
GRANT SELECT ON public.vw_deadlines TO authenticated;
