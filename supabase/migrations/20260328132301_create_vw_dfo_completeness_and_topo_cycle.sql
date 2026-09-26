-- VIEW 1: Completude do DFO por item
CREATE OR REPLACE VIEW public.vw_dfo_completeness
WITH (security_invoker = true)
AS
WITH item_stats AS (
  SELECT
    di.id, di.volume_id, di.project_id, di.code, di.title,
    di.document_type, di.status, di.linked_doc_id, di.sort_order,
    dv.volume_no, dv.title AS volume_title,
    CASE
      WHEN di.document_type = 'plan' AND di.title ILIKE '%PPI%' THEN
        (SELECT COUNT(*) > 0 FROM public.ppi_instances pi WHERE pi.project_id = di.project_id AND pi.status = 'approved' AND pi.is_deleted = false)
      WHEN di.title ILIKE '%Relat%Mensal%' OR di.title ILIKE '%RM-SGQ%' THEN
        (SELECT COUNT(*) > 0 FROM public.monthly_quality_reports mr WHERE mr.project_id = di.project_id AND mr.status IN ('submitted','accepted'))
      WHEN di.title ILIKE '%Auditoria%' OR di.title ILIKE '%RAI%' OR di.title ILIKE '%PAI%' THEN
        (SELECT COUNT(*) > 0 FROM public.quality_audits qa WHERE qa.project_id = di.project_id AND qa.status = 'completed')
      WHEN di.title ILIKE '%Forma%' OR di.title ILIKE '%RF%' THEN
        (SELECT COUNT(*) > 0 FROM public.training_sessions ts WHERE ts.project_id = di.project_id)
      WHEN di.title ILIKE '%PAME%' THEN
        (SELECT COUNT(*) > 0 FROM public.materials m WHERE m.project_id = di.project_id AND m.pame_status = 'approved' AND m.is_deleted = false)
      WHEN di.title ILIKE '%Ensaio%' OR di.title ILIKE '%Boletim%' THEN
        (SELECT COUNT(*) > 0 FROM public.concrete_batches cb WHERE cb.project_id = di.project_id)
      WHEN di.title ILIKE '%Topogr%' OR di.title ILIKE '%Tela%' THEN
        (SELECT COUNT(*) > 0 FROM public.topography_controls tc WHERE tc.project_id = di.project_id)
      WHEN di.linked_doc_id IS NOT NULL THEN true
      WHEN di.status = 'received' THEN true
      ELSE false
    END AS auto_complete,
    CASE
      WHEN di.title ILIKE '%PPI%' THEN (SELECT COUNT(*)::text FROM public.ppi_instances WHERE project_id = di.project_id AND status = 'approved' AND is_deleted = false)
      WHEN di.title ILIKE '%Relat%Mensal%' OR di.title ILIKE '%RM-SGQ%' THEN (SELECT COUNT(*)::text FROM public.monthly_quality_reports WHERE project_id = di.project_id)
      WHEN di.title ILIKE '%Auditoria%' OR di.title ILIKE '%RAI%' THEN (SELECT COUNT(*)::text FROM public.quality_audits WHERE project_id = di.project_id AND status = 'completed')
      WHEN di.title ILIKE '%Forma%' THEN (SELECT COUNT(*)::text FROM public.training_sessions WHERE project_id = di.project_id)
      ELSE NULL
    END AS support_count
  FROM public.dfo_items di
  JOIN public.dfo_volumes dv ON dv.id = di.volume_id
)
SELECT i.*,
  CASE
    WHEN i.status = 'received' OR i.linked_doc_id IS NOT NULL THEN 'received'
    WHEN i.auto_complete THEN 'auto_complete'
    ELSE 'pending'
  END AS effective_status
FROM item_stats i;

-- VIEW 1b: Progresso por volume
CREATE OR REPLACE VIEW public.vw_dfo_volume_progress
WITH (security_invoker = true)
AS
SELECT project_id, volume_no, volume_title,
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE effective_status IN ('received','auto_complete')) AS complete_items,
  COUNT(*) FILTER (WHERE effective_status = 'pending') AS pending_items,
  ROUND(COUNT(*) FILTER (WHERE effective_status IN ('received','auto_complete'))::numeric / NULLIF(COUNT(*),0)::numeric * 100, 1) AS completion_pct
FROM public.vw_dfo_completeness
GROUP BY project_id, volume_no, volume_title
ORDER BY volume_no;

-- VIEW 2: Ciclo topografia — pedido → levantamento
CREATE OR REPLACE VIEW public.vw_topography_cycle
WITH (security_invoker = true)
AS
SELECT
  tr.project_id,
  tr.id AS request_id,
  tr.zone AS request_zone,
  tr.description AS request_description,
  tr.request_type,
  tr.request_date,
  tr.priority,
  tr.status AS request_status,
  tr.work_item_id,
  wi.sector, wi.parte,
  tc_match.control_id,
  tc_match.control_element,
  tc_match.control_date,
  tc_match.control_result,
  tc_match.measured_value,
  tc_match.deviation,
  tc_match.tolerance,
  tc_match.technician,
  tc_match.equipment_code,
  CASE WHEN tc_match.control_date IS NOT NULL THEN tc_match.control_date - tr.request_date ELSE NULL END AS days_to_execute,
  CASE
    WHEN tc_match.control_id IS NOT NULL AND tc_match.control_result = 'conforme' THEN 'closed_ok'
    WHEN tc_match.control_id IS NOT NULL AND tc_match.control_result = 'nao_conforme' THEN 'closed_nok'
    WHEN tc_match.control_id IS NOT NULL THEN 'closed'
    WHEN tr.status = 'pending' AND tr.request_date < CURRENT_DATE - 7 THEN 'overdue'
    WHEN tr.status = 'pending' THEN 'pending'
    ELSE tr.status
  END AS cycle_status
FROM public.topography_requests tr
LEFT JOIN public.work_items wi ON wi.id = tr.work_item_id AND wi.is_deleted = false
LEFT JOIN LATERAL (
  SELECT tc2.id AS control_id, tc2.element AS control_element,
    tc2.execution_date AS control_date, tc2.result AS control_result,
    tc2.measured_value, tc2.deviation, tc2.tolerance, tc2.technician,
    te2.code AS equipment_code
  FROM public.topography_controls tc2
  LEFT JOIN public.topography_equipment te2 ON te2.id = tc2.equipment_id
  WHERE tc2.project_id = tr.project_id
    AND (tc2.work_item_id = tr.work_item_id OR tc2.zone = tr.zone)
    AND tc2.execution_date BETWEEN tr.request_date - 3 AND tr.request_date + 30
  ORDER BY ABS(tc2.execution_date - tr.request_date) ASC
  LIMIT 1
) tc_match ON true
ORDER BY tr.request_date DESC;

-- VIEW 3: Resumo mensal de qualidade
CREATE OR REPLACE VIEW public.vw_monthly_quality_summary
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  DATE_TRUNC('month', CURRENT_DATE)::date AS current_month,
  (SELECT COUNT(*) FROM public.non_conformities WHERE project_id=p.id AND is_deleted=false AND status NOT IN ('closed','archived')) AS nc_open,
  (SELECT COUNT(*) FROM public.non_conformities WHERE project_id=p.id AND is_deleted=false AND status='closed' AND closure_date >= DATE_TRUNC('month',CURRENT_DATE)::date) AS nc_closed_this_month,
  (SELECT COUNT(*) FROM public.non_conformities WHERE project_id=p.id AND is_deleted=false AND severity='critical' AND status NOT IN ('closed','archived')) AS nc_critical_open,
  (SELECT COUNT(*) FROM public.ppi_instances WHERE project_id=p.id AND is_deleted=false AND status='approved' AND approved_at >= DATE_TRUNC('month',CURRENT_DATE)) AS ppi_approved_this_month,
  (SELECT COUNT(*) FROM public.ppi_instances WHERE project_id=p.id AND is_deleted=false AND status IN ('draft','in_progress')) AS ppi_in_progress,
  (SELECT COUNT(*) FROM public.hp_notifications WHERE project_id=p.id AND status='confirmed' AND confirmed_at::date >= DATE_TRUNC('month',CURRENT_DATE)::date) AS hp_confirmed_this_month,
  (SELECT COUNT(*) FROM public.hp_notifications WHERE project_id=p.id AND status='pending') AS hp_pending,
  (SELECT COUNT(*) FROM public.concrete_batches WHERE project_id=p.id AND batch_date >= DATE_TRUNC('month',CURRENT_DATE)::date) AS concrete_batches_month,
  (SELECT COUNT(*) FROM public.weld_records WHERE project_id=p.id AND weld_date >= DATE_TRUNC('month',CURRENT_DATE)::date) AS welds_month,
  (SELECT COUNT(*) FROM public.weld_records WHERE project_id=p.id AND weld_date >= DATE_TRUNC('month',CURRENT_DATE)::date AND overall_result='fail') AS welds_fail_month,
  (SELECT COUNT(*) FROM public.topography_controls WHERE project_id=p.id AND execution_date >= DATE_TRUNC('month',CURRENT_DATE)::date) AS topo_controls_month,
  (SELECT COUNT(*) FROM public.topography_controls WHERE project_id=p.id AND execution_date >= DATE_TRUNC('month',CURRENT_DATE)::date AND result='nao_conforme') AS topo_fail_month,
  (SELECT COUNT(*) FROM public.daily_reports WHERE project_id=p.id AND report_date >= DATE_TRUNC('month',CURRENT_DATE)::date AND is_deleted=false) AS daily_reports_month,
  (SELECT COUNT(*) FROM public.vw_deadlines WHERE project_id=p.id AND severity='critical' AND days_remaining BETWEEN 0 AND 30) AS deadlines_critical_30d
FROM public.projects p
WHERE p.status != 'inactive';
