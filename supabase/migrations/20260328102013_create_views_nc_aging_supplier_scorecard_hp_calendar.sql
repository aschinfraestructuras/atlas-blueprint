-- ============================================================
-- VIEW 1: NCs por tempo aberto (aging) por disciplina
-- ============================================================
CREATE OR REPLACE VIEW public.vw_nc_aging
WITH (security_invoker = true)
AS
SELECT
  project_id,
  discipline,
  severity,
  COUNT(*) AS total_open,
  COUNT(*) FILTER (WHERE CURRENT_DATE - detected_at BETWEEN 0 AND 29)  AS aging_0_30d,
  COUNT(*) FILTER (WHERE CURRENT_DATE - detected_at BETWEEN 30 AND 59) AS aging_30_60d,
  COUNT(*) FILTER (WHERE CURRENT_DATE - detected_at BETWEEN 60 AND 89) AS aging_60_90d,
  COUNT(*) FILTER (WHERE CURRENT_DATE - detected_at >= 90)             AS aging_90d_plus,
  ROUND(AVG(CURRENT_DATE - detected_at), 1)                            AS avg_days_open,
  MAX(CURRENT_DATE - detected_at)                                      AS max_days_open
FROM public.non_conformities
WHERE status NOT IN ('closed', 'archived', 'cancelled')
  AND is_deleted = false
GROUP BY project_id, discipline, severity
ORDER BY project_id, avg_days_open DESC;

-- ============================================================
-- VIEW 2: Scorecard de fornecedor
-- ============================================================
CREATE OR REPLACE VIEW public.vw_supplier_scorecard
WITH (security_invoker = true)
AS
SELECT
  s.id AS supplier_id,
  s.project_id,
  s.name AS supplier_name,
  s.code AS supplier_code,
  s.category,
  s.qualification_status,
  s.approval_status,

  -- Lotes de material
  COUNT(DISTINCT ml.id)                                                 AS total_lots,
  COUNT(DISTINCT ml.id) FILTER (WHERE ml.reception_status = 'approved') AS lots_approved,
  COUNT(DISTINCT ml.id) FILTER (WHERE ml.reception_status = 'rejected') AS lots_rejected,
  COUNT(DISTINCT ml.id) FILTER (WHERE ml.reception_status = 'quarantine') AS lots_quarantine,

  -- NCs abertas associadas
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false AND nc.status NOT IN ('closed','archived')) AS nc_open,
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false AND nc.severity = 'critical' AND nc.status NOT IN ('closed','archived')) AS nc_critical,

  -- Ensaios (test_results)
  COUNT(DISTINCT tr.id)                                                 AS tests_total,
  COUNT(DISTINCT tr.id) FILTER (WHERE tr.pass_fail = 'fail')           AS tests_fail,

  -- Avaliações
  COUNT(DISTINCT se.id)                                                 AS evaluations_total,
  ROUND(AVG(se.score), 1)                                              AS score_avg,
  ( SELECT se2.result FROM public.supplier_evaluations se2
    WHERE se2.supplier_id = s.id
    ORDER BY se2.eval_date DESC LIMIT 1 )                              AS last_eval_result,
  ( SELECT se2.eval_date FROM public.supplier_evaluations se2
    WHERE se2.supplier_id = s.id
    ORDER BY se2.eval_date DESC LIMIT 1 )                              AS last_eval_date,

  -- Score composto (0-100): base 100 - penalizações
  GREATEST(0, LEAST(100,
    100
    - COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false AND nc.status NOT IN ('closed','archived') AND nc.severity = 'critical') * 20
    - COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false AND nc.status NOT IN ('closed','archived') AND nc.severity = 'major') * 10
    - COUNT(DISTINCT ml.id) FILTER (WHERE ml.reception_status = 'rejected') * 15
    - CASE WHEN COUNT(DISTINCT tr.id) > 0 THEN
        ROUND(COUNT(DISTINCT tr.id) FILTER (WHERE tr.pass_fail = 'fail')::numeric / COUNT(DISTINCT tr.id)::numeric * 30)
      ELSE 0 END
  ))::int AS quality_score

FROM public.suppliers s
LEFT JOIN public.material_lots ml ON ml.supplier_id = s.id AND ml.is_deleted = false
LEFT JOIN public.non_conformities nc ON nc.supplier_id = s.id
LEFT JOIN public.test_results tr ON tr.supplier_id = s.id AND tr.is_deleted = false
LEFT JOIN public.supplier_evaluations se ON se.supplier_id = s.id
WHERE s.is_deleted = false
GROUP BY s.id, s.project_id, s.name, s.code, s.category, s.qualification_status, s.approval_status
ORDER BY quality_score ASC;

-- ============================================================
-- VIEW 3: Calendário de HPs por semana
-- ============================================================
CREATE OR REPLACE VIEW public.vw_hp_calendar
WITH (security_invoker = true)
AS
SELECT
  hn.project_id,
  hn.id AS hp_id,
  hn.code,
  hn.ppi_ref,
  hn.point_no,
  hn.activity,
  hn.location_pk,
  hn.planned_datetime,
  hn.planned_datetime::date AS planned_date,
  DATE_TRUNC('week', hn.planned_datetime)::date AS week_start,
  hn.status,
  hn.confirmed_at,
  pi.id AS ppi_instance_id,
  pi.code AS ppi_code,
  pi.status AS ppi_status,
  wi.id AS work_item_id,
  wi.sector,
  wi.parte,
  wi.disciplina,
  EXTRACT(DOW FROM hn.planned_datetime)::int AS day_of_week
FROM public.hp_notifications hn
JOIN public.ppi_instances pi ON pi.id = hn.instance_id
LEFT JOIN public.work_items wi ON wi.id = pi.work_item_id
WHERE pi.is_deleted = false
ORDER BY hn.planned_datetime;

-- ============================================================
-- VIEW 4: Detalhe de prontidão por work item (o que bloqueia)
-- ============================================================
CREATE OR REPLACE VIEW public.vw_work_item_readiness_detail
WITH (security_invoker = true)
AS
SELECT
  wi.id AS work_item_id,
  wi.project_id,
  wi.sector,
  wi.parte,
  wi.elemento,
  wi.disciplina,
  wi.status,
  wi.readiness_status,

  -- PPIs pendentes
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', pi.id, 'code', pi.code, 'status', pi.status))
    FROM public.ppi_instances pi
    WHERE pi.work_item_id = wi.id AND pi.is_deleted = false
      AND pi.status IN ('draft','in_progress','submitted')
  ), '[]'::jsonb) AS pending_ppis,

  -- NCs abertas
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', nc.id, 'code', nc.code, 'severity', nc.severity, 'status', nc.status))
    FROM public.non_conformities nc
    WHERE nc.work_item_id = wi.id AND nc.is_deleted = false
      AND nc.status NOT IN ('closed','archived')
  ), '[]'::jsonb) AS open_ncs,

  -- Soldaduras fail/pending
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', wr.id, 'code', wr.code, 'result', wr.overall_result))
    FROM public.weld_records wr
    WHERE wr.work_item_id = wi.id
      AND wr.overall_result IN ('fail','pending','repair_needed')
  ), '[]'::jsonb) AS blocking_welds,

  -- Solos inaptos
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', ss.id, 'code', ss.code, 'result', ss.overall_result))
    FROM public.soil_samples ss
    WHERE ss.work_item_id = wi.id AND ss.overall_result = 'inapto'
  ), '[]'::jsonb) AS blocking_soils,

  -- Ensaios agendados em atraso
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', tdi.id, 'test', tc.name, 'due', tdi.due_at_date, 'status', tdi.status))
    FROM public.test_due_items tdi
    JOIN public.test_plan_rules tpr ON tpr.id = tdi.plan_rule_id
    JOIN public.tests_catalog tc ON tc.id = tpr.test_id
    WHERE tdi.work_item_id = wi.id AND tdi.is_deleted = false
      AND tdi.status IN ('due','overdue')
  ), '[]'::jsonb) AS overdue_tests

FROM public.work_items wi
WHERE wi.is_deleted = false
  AND wi.readiness_status IN ('blocked','not_ready');
