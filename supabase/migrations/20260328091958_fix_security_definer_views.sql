-- Recriar as 3 views com SECURITY INVOKER (padrão seguro)
-- As views passam a usar as permissões do utilizador que faz a query
-- em vez das permissões do criador da view

-- 1. view_physical_tests_monthly
DROP VIEW IF EXISTS public.view_physical_tests_monthly_total;
DROP VIEW IF EXISTS public.view_physical_tests_monthly;

CREATE VIEW public.view_physical_tests_monthly
WITH (security_invoker = true)
AS
WITH months AS (
  SELECT project_id, date_trunc('month', batch_date::date)::date AS month,
    concrete_class AS category, 'betao' AS tipo, 1 AS total,
    CASE WHEN EXISTS (
      SELECT 1 FROM concrete_specimens cs
      WHERE cs.batch_id = cb.id AND cs.break_load_kn IS NOT NULL AND cs.cure_days = 28
    ) THEN 1 ELSE 0 END AS com_resultado,
    CASE WHEN (
      SELECT MIN(cs.strength_mpa) FROM concrete_specimens cs
      WHERE cs.batch_id = cb.id AND cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL
    ) >= (SUBSTRING(cb.concrete_class, 'C(\d+)')::numeric - 4) THEN 1 ELSE 0 END AS conforme
  FROM concrete_batches cb
  UNION ALL
  SELECT project_id, date_trunc('month', weld_date)::date AS month,
    weld_type AS category, 'soldaduras' AS tipo, 1 AS total,
    CASE WHEN overall_result != 'pending' THEN 1 ELSE 0 END AS com_resultado,
    CASE WHEN overall_result = 'pass' THEN 1 ELSE 0 END AS conforme
  FROM weld_records
  UNION ALL
  SELECT project_id, date_trunc('month', sample_date)::date AS month,
    material_type AS category, 'solos' AS tipo, 1 AS total,
    CASE WHEN overall_result != 'pending' THEN 1 ELSE 0 END AS com_resultado,
    CASE WHEN overall_result = 'apto' THEN 1 ELSE 0 END AS conforme
  FROM soil_samples
  UNION ALL
  SELECT project_id, date_trunc('month', test_date)::date AS month,
    material_type AS category, 'compactacao' AS tipo, 1 AS total,
    CASE WHEN overall_result != 'pending' THEN 1 ELSE 0 END AS com_resultado,
    CASE WHEN overall_result = 'pass' THEN 1 ELSE 0 END AS conforme
  FROM compaction_zones
)
SELECT project_id, month, tipo,
  SUM(total) AS total, SUM(com_resultado) AS com_resultado,
  SUM(conforme) AS conforme,
  SUM(total) - SUM(conforme) - (SUM(total) - SUM(com_resultado)) AS nao_conforme,
  SUM(total) - SUM(com_resultado) AS pendente,
  CASE WHEN SUM(com_resultado) = 0 THEN NULL
    ELSE ROUND((SUM(conforme)::numeric / SUM(com_resultado)::numeric) * 100, 1)
  END AS taxa_conformidade_pct
FROM months
WHERE month >= date_trunc('month', CURRENT_DATE - INTERVAL '11 months')::date
GROUP BY project_id, month, tipo
ORDER BY project_id, month, tipo;

-- 2. view_physical_tests_monthly_total
CREATE VIEW public.view_physical_tests_monthly_total
WITH (security_invoker = true)
AS
SELECT project_id, month,
  SUM(total) AS total, SUM(com_resultado) AS com_resultado,
  SUM(conforme) AS conforme,
  SUM(total) - SUM(conforme) - (SUM(total) - SUM(com_resultado)) AS nao_conforme,
  CASE WHEN SUM(com_resultado) = 0 THEN NULL
    ELSE ROUND((SUM(conforme)::numeric / SUM(com_resultado)::numeric) * 100, 1)
  END AS taxa_conformidade_pct
FROM public.view_physical_tests_monthly
GROUP BY project_id, month
ORDER BY project_id, month;

-- 3. vw_project_health
CREATE OR REPLACE VIEW public.vw_project_health
WITH (security_invoker = true)
AS
WITH nc_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status NOT IN ('closed','archived') AND is_deleted = false) AS nc_open,
    COUNT(*) FILTER (WHERE status NOT IN ('closed','archived') AND is_deleted = false AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS nc_overdue
  FROM non_conformities GROUP BY project_id
),
test_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status IN ('draft','pending','in_progress')) AS tests_pending,
    COUNT(*) FILTER (WHERE pass_fail = 'fail' AND created_at >= CURRENT_DATE - 30) AS tests_fail_30d_generic
  FROM test_results GROUP BY project_id
),
physical_tests_fail AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE overall_result = 'fail' AND weld_date >= CURRENT_DATE - 30) AS welds_fail
  FROM weld_records GROUP BY project_id
),
physical_soil_fail AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE overall_result = 'inapto' AND sample_date >= CURRENT_DATE - 30) AS soils_fail
  FROM soil_samples GROUP BY project_id
),
physical_compaction_fail AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE overall_result = 'fail' AND test_date >= CURRENT_DATE - 30) AS compaction_fail
  FROM compaction_zones GROUP BY project_id
),
ppi_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status NOT IN ('approved','archived') AND is_deleted = false) AS ppi_pending
  FROM ppi_instances GROUP BY project_id
),
doc_stats AS (
  SELECT d.project_id,
    COUNT(*) FILTER (WHERE
      EXISTS (SELECT 1 FROM supplier_documents sd WHERE sd.document_id = d.id AND sd.valid_to < CURRENT_DATE AND sd.status != 'expired')
      OR EXISTS (SELECT 1 FROM material_documents md WHERE md.document_id = d.id AND md.valid_to < CURRENT_DATE AND md.status != 'expired')
      OR EXISTS (SELECT 1 FROM subcontractor_documents scd WHERE scd.document_id = d.id AND scd.valid_to < CURRENT_DATE AND scd.status != 'expired')
    ) AS docs_expired
  FROM documents d WHERE d.is_deleted = false GROUP BY d.project_id
),
cal_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE calibration_status = 'expired' OR (calibration_valid_until IS NOT NULL AND calibration_valid_until < CURRENT_DATE)) AS calibrations_expired
  FROM topography_equipment GROUP BY project_id
),
activity_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status = 'blocked') AS activities_blocked
  FROM planning_activities GROUP BY project_id
),
wi_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status != 'planned') AS total_wi_active,
    COUNT(*) FILTER (WHERE readiness_status = 'ready') AS ready_wi
  FROM work_items WHERE is_deleted = false GROUP BY project_id
)
SELECT p.id AS project_id,
  COALESCE(nc.nc_open, 0)::int AS total_nc_open,
  COALESCE(nc.nc_overdue, 0)::int AS total_nc_overdue,
  COALESCE(ts.tests_pending, 0)::int AS total_tests_pending,
  (COALESCE(ts.tests_fail_30d_generic, 0) + COALESCE(wf.welds_fail, 0) + COALESCE(sf.soils_fail, 0) + COALESCE(cf.compaction_fail, 0))::int AS total_tests_fail_30d,
  COALESCE(pp.ppi_pending, 0)::int AS total_ppi_pending,
  COALESCE(ds.docs_expired, 0)::int AS total_documents_expired,
  COALESCE(cs.calibrations_expired, 0)::int AS total_calibrations_expired,
  COALESCE(acts.activities_blocked, 0)::int AS activities_blocked,
  CASE WHEN COALESCE(wi.total_wi_active, 0) = 0 THEN 100
    ELSE ROUND((COALESCE(wi.ready_wi, 0)::numeric / wi.total_wi_active::numeric) * 100)
  END::int AS readiness_ratio,
  GREATEST(0, LEAST(100,
    100
    - COALESCE(nc.nc_overdue, 0) * 20
    - (COALESCE(ts.tests_fail_30d_generic, 0) + COALESCE(wf.welds_fail, 0) + COALESCE(sf.soils_fail, 0) + COALESCE(cf.compaction_fail, 0)) * 10
    - COALESCE(ds.docs_expired, 0) * 5
    - COALESCE(cs.calibrations_expired, 0) * 5
    - COALESCE(acts.activities_blocked, 0) * 3
    - CASE WHEN COALESCE(wi.total_wi_active, 0) > 0 AND (COALESCE(wi.ready_wi, 0)::numeric / wi.total_wi_active::numeric) < 0.6 THEN 15 ELSE 0 END
  ))::int AS health_score,
  CASE
    WHEN GREATEST(0, LEAST(100, 100 - COALESCE(nc.nc_overdue,0)*20 - (COALESCE(ts.tests_fail_30d_generic,0)+COALESCE(wf.welds_fail,0)+COALESCE(sf.soils_fail,0)+COALESCE(cf.compaction_fail,0))*10 - COALESCE(ds.docs_expired,0)*5 - COALESCE(cs.calibrations_expired,0)*5 - COALESCE(acts.activities_blocked,0)*3 - CASE WHEN COALESCE(wi.total_wi_active,0)>0 AND (COALESCE(wi.ready_wi,0)::numeric/wi.total_wi_active::numeric)<0.6 THEN 15 ELSE 0 END)) >= 80 THEN 'healthy'
    WHEN GREATEST(0, LEAST(100, 100 - COALESCE(nc.nc_overdue,0)*20 - (COALESCE(ts.tests_fail_30d_generic,0)+COALESCE(wf.welds_fail,0)+COALESCE(sf.soils_fail,0)+COALESCE(cf.compaction_fail,0))*10 - COALESCE(ds.docs_expired,0)*5 - COALESCE(cs.calibrations_expired,0)*5 - COALESCE(acts.activities_blocked,0)*3 - CASE WHEN COALESCE(wi.total_wi_active,0)>0 AND (COALESCE(wi.ready_wi,0)::numeric/wi.total_wi_active::numeric)<0.6 THEN 15 ELSE 0 END)) >= 60 THEN 'attention'
    ELSE 'critical'
  END AS health_status
FROM projects p
LEFT JOIN nc_stats nc ON nc.project_id = p.id
LEFT JOIN test_stats ts ON ts.project_id = p.id
LEFT JOIN physical_tests_fail wf ON wf.project_id = p.id
LEFT JOIN physical_soil_fail sf ON sf.project_id = p.id
LEFT JOIN physical_compaction_fail cf ON cf.project_id = p.id
LEFT JOIN ppi_stats pp ON pp.project_id = p.id
LEFT JOIN doc_stats ds ON ds.project_id = p.id
LEFT JOIN cal_stats cs ON cs.project_id = p.id
LEFT JOIN activity_stats acts ON acts.project_id = p.id
LEFT JOIN wi_stats wi ON wi.project_id = p.id
WHERE p.status != 'inactive';
