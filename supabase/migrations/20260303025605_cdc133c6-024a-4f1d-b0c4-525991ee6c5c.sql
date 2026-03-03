
DROP VIEW IF EXISTS public.vw_deadlines CASCADE;

CREATE VIEW public.vw_deadlines AS

SELECT sd.id::text AS id, sd.project_id, 'supplier_doc'::text AS source, sd.supplier_id::text AS entity_id, COALESCE(s.name, 'Fornecedor') AS entity_label, sd.document_id::text AS document_id, sd.valid_to::date AS due_date, sd.status, CASE WHEN sd.valid_to::date < CURRENT_DATE THEN 'critical' WHEN sd.valid_to::date <= CURRENT_DATE + 7 THEN 'critical' WHEN sd.valid_to::date <= CURRENT_DATE + 30 THEN 'warning' ELSE 'info' END AS severity, (sd.valid_to::date - CURRENT_DATE) AS days_remaining, sd.doc_type, NULL::text AS assigned_to
FROM public.supplier_documents sd LEFT JOIN public.suppliers s ON s.id = sd.supplier_id WHERE sd.valid_to IS NOT NULL

UNION ALL
SELECT md.id::text, md.project_id, 'material_doc'::text, md.material_id::text, COALESCE(m.name, 'Material'), md.document_id::text, md.valid_to::date, md.status, CASE WHEN md.valid_to::date < CURRENT_DATE THEN 'critical' WHEN md.valid_to::date <= CURRENT_DATE + 7 THEN 'critical' WHEN md.valid_to::date <= CURRENT_DATE + 30 THEN 'warning' ELSE 'info' END, (md.valid_to::date - CURRENT_DATE), md.doc_type, NULL::text
FROM public.material_documents md LEFT JOIN public.materials m ON m.id = md.material_id WHERE md.valid_to IS NOT NULL

UNION ALL
SELECT scd.id::text, scd.project_id, 'subcontractor_doc'::text, scd.subcontractor_id::text, COALESCE(sc.name, 'Subempreiteiro'), scd.document_id::text, scd.valid_to::date, scd.status, CASE WHEN scd.valid_to::date < CURRENT_DATE THEN 'critical' WHEN scd.valid_to::date <= CURRENT_DATE + 7 THEN 'critical' WHEN scd.valid_to::date <= CURRENT_DATE + 30 THEN 'warning' ELSE 'info' END, (scd.valid_to::date - CURRENT_DATE), scd.doc_type, NULL::text
FROM public.subcontractor_documents scd LEFT JOIN public.subcontractors sc ON sc.id = scd.subcontractor_id WHERE scd.valid_to IS NOT NULL

UNION ALL
SELECT ec.id::text, ec.project_id, 'calibration'::text, ec.equipment_id::text, COALESCE(te.code, 'Equipamento'), ec.document_id::text, ec.valid_until::date, ec.status, CASE WHEN ec.valid_until::date < CURRENT_DATE THEN 'critical' WHEN ec.valid_until::date <= CURRENT_DATE + 7 THEN 'critical' WHEN ec.valid_until::date <= CURRENT_DATE + 30 THEN 'warning' ELSE 'info' END, (ec.valid_until::date - CURRENT_DATE), 'calibration'::text, NULL::text
FROM public.equipment_calibrations ec LEFT JOIN public.topography_equipment te ON te.id = ec.equipment_id

UNION ALL
SELECT nc.id::text, nc.project_id, 'nc_due'::text, nc.id::text, COALESCE(nc.code, nc.title, 'NC'), nc.document_id::text, nc.due_date, nc.status, CASE WHEN nc.due_date < CURRENT_DATE THEN 'critical' WHEN nc.due_date <= CURRENT_DATE + 7 THEN 'critical' WHEN nc.due_date <= CURRENT_DATE + 30 THEN 'warning' ELSE 'info' END, (nc.due_date - CURRENT_DATE), 'nc'::text, nc.assigned_to::text
FROM public.non_conformities nc WHERE nc.due_date IS NOT NULL AND nc.is_deleted = false AND nc.status NOT IN ('closed', 'archived')

UNION ALL
SELECT r.id::text, r.project_id, 'rfi_due'::text, r.id::text, COALESCE(r.code, r.subject), NULL::text, r.deadline, r.status, CASE WHEN r.deadline < CURRENT_DATE THEN 'critical' WHEN r.deadline <= CURRENT_DATE + 7 THEN 'critical' WHEN r.deadline <= CURRENT_DATE + 30 THEN 'warning' ELSE 'info' END, (r.deadline - CURRENT_DATE), 'rfi'::text, r.recipient::text
FROM public.rfis r WHERE r.deadline IS NOT NULL AND r.is_deleted = false AND r.status NOT IN ('closed', 'archived')

UNION ALL
SELECT toi.id::text, toi.project_id, 'tech_office_due'::text, toi.id::text, COALESCE(toi.code, toi.title), NULL::text, toi.deadline, toi.status, CASE WHEN toi.deadline < CURRENT_DATE THEN 'critical' WHEN toi.deadline <= CURRENT_DATE + 7 THEN 'critical' WHEN toi.deadline <= CURRENT_DATE + 30 THEN 'warning' ELSE 'info' END, (toi.deadline - CURRENT_DATE), COALESCE(toi.type, 'tech_office')::text, toi.assigned_to::text
FROM public.technical_office_items toi WHERE toi.deadline IS NOT NULL AND toi.is_deleted = false AND toi.status NOT IN ('closed', 'archived')

UNION ALL
SELECT pa.id::text, pa.project_id, 'planning_due'::text, pa.id::text, pa.description, NULL::text, pa.planned_end, pa.status, CASE WHEN pa.planned_end < CURRENT_DATE THEN 'critical' WHEN pa.planned_end <= CURRENT_DATE + 7 THEN 'critical' WHEN pa.planned_end <= CURRENT_DATE + 30 THEN 'warning' ELSE 'info' END, (pa.planned_end - CURRENT_DATE), 'planning'::text, NULL::text
FROM public.planning_activities pa WHERE pa.planned_end IS NOT NULL AND pa.actual_end IS NULL AND pa.status IN ('in_progress', 'blocked');
