
-- Fix: Change vw_deadlines to SECURITY INVOKER (default for new views, but explicit)
DROP VIEW IF EXISTS public.vw_deadlines;
CREATE VIEW public.vw_deadlines
WITH (security_invoker = true)
AS

-- A) Supplier documents
SELECT
  sd.id::text AS id,
  sd.project_id,
  'supplier_doc'::text AS source,
  sd.supplier_id AS entity_id,
  s.name AS entity_label,
  sd.id AS document_id,
  sd.valid_to AS due_date,
  sd.status,
  sd.doc_type,
  NULL::uuid AS assigned_to,
  CASE
    WHEN sd.valid_to < CURRENT_DATE THEN 'critical'
    WHEN sd.valid_to <= CURRENT_DATE + 7 THEN 'critical'
    WHEN sd.valid_to <= CURRENT_DATE + 30 THEN 'warning'
    ELSE 'info'
  END AS severity,
  (sd.valid_to - CURRENT_DATE) AS days_remaining
FROM supplier_documents sd
JOIN suppliers s ON s.id = sd.supplier_id AND s.is_deleted = false
WHERE sd.valid_to IS NOT NULL

UNION ALL

-- B) Material documents
SELECT
  md.id::text,
  md.project_id,
  'material_doc'::text,
  md.material_id,
  m.code || ' — ' || m.name,
  md.document_id,
  md.valid_to,
  md.status,
  md.doc_type,
  NULL::uuid,
  CASE
    WHEN md.valid_to < CURRENT_DATE THEN 'critical'
    WHEN md.valid_to <= CURRENT_DATE + 7 THEN 'critical'
    WHEN md.valid_to <= CURRENT_DATE + 30 THEN 'warning'
    ELSE 'info'
  END,
  (md.valid_to - CURRENT_DATE)
FROM material_documents md
JOIN materials m ON m.id = md.material_id AND m.is_deleted = false
WHERE md.valid_to IS NOT NULL

UNION ALL

-- C) Equipment calibrations
SELECT
  ec.id::text,
  ec.project_id,
  'calibration'::text,
  ec.equipment_id,
  te.code || ' — ' || te.model,
  ec.document_id,
  ec.valid_until,
  ec.status,
  'calibration'::text,
  NULL::uuid,
  CASE
    WHEN ec.valid_until < CURRENT_DATE THEN 'critical'
    WHEN ec.valid_until <= CURRENT_DATE + 7 THEN 'critical'
    WHEN ec.valid_until <= CURRENT_DATE + 30 THEN 'warning'
    ELSE 'info'
  END,
  (ec.valid_until - CURRENT_DATE)
FROM equipment_calibrations ec
JOIN topography_equipment te ON te.id = ec.equipment_id

UNION ALL

-- D) NC overdue
SELECT
  nc.id::text,
  nc.project_id,
  'nc_due'::text,
  nc.id,
  COALESCE(nc.code, nc.title, 'NC'),
  nc.document_id,
  nc.due_date,
  nc.status,
  nc.category,
  nc.assigned_to,
  CASE
    WHEN nc.due_date < CURRENT_DATE THEN 'critical'
    WHEN nc.due_date <= CURRENT_DATE + 7 THEN 'critical'
    WHEN nc.due_date <= CURRENT_DATE + 30 THEN 'warning'
    ELSE 'info'
  END,
  (nc.due_date - CURRENT_DATE)
FROM non_conformities nc
WHERE nc.is_deleted = false
  AND nc.due_date IS NOT NULL
  AND nc.status NOT IN ('closed', 'verified')

UNION ALL

-- E) RFI deadlines
SELECT
  r.id::text,
  r.project_id,
  'rfi_due'::text,
  r.id,
  COALESCE(r.code, r.subject),
  NULL::uuid,
  r.deadline,
  r.status,
  r.priority,
  r.recipient,
  CASE
    WHEN r.deadline < CURRENT_DATE THEN 'critical'
    WHEN r.deadline <= CURRENT_DATE + 7 THEN 'critical'
    WHEN r.deadline <= CURRENT_DATE + 30 THEN 'warning'
    ELSE 'info'
  END,
  (r.deadline - CURRENT_DATE)
FROM rfis r
WHERE r.is_deleted = false
  AND r.deadline IS NOT NULL
  AND r.status NOT IN ('closed', 'answered')

UNION ALL

-- F) Technical office items
SELECT
  toi.id::text,
  toi.project_id,
  'tech_office_due'::text,
  toi.id,
  toi.title,
  toi.document_id,
  toi.due_date,
  toi.status,
  toi.type,
  NULL::uuid,
  CASE
    WHEN toi.due_date < CURRENT_DATE THEN 'critical'
    WHEN toi.due_date <= CURRENT_DATE + 7 THEN 'critical'
    WHEN toi.due_date <= CURRENT_DATE + 30 THEN 'warning'
    ELSE 'info'
  END,
  (toi.due_date - CURRENT_DATE)
FROM technical_office_items toi
WHERE toi.due_date IS NOT NULL
  AND toi.status NOT IN ('closed', 'completed', 'cancelled')

UNION ALL

-- G) Planning activities overdue
SELECT
  pa.id::text,
  pa.project_id,
  'planning_due'::text,
  pa.id,
  pa.description,
  NULL::uuid,
  pa.planned_end,
  pa.status,
  'planning'::text,
  NULL::uuid,
  CASE
    WHEN pa.planned_end < CURRENT_DATE THEN 'critical'
    WHEN pa.planned_end <= CURRENT_DATE + 7 THEN 'critical'
    WHEN pa.planned_end <= CURRENT_DATE + 30 THEN 'warning'
    ELSE 'info'
  END,
  (pa.planned_end - CURRENT_DATE)
FROM planning_activities pa
WHERE pa.planned_end IS NOT NULL
  AND pa.actual_end IS NULL
  AND pa.status IN ('in_progress', 'blocked');

GRANT SELECT ON public.vw_deadlines TO authenticated;
