
-- ══════════════════════════════════════════════════════════════
-- vw_project_health: project-level health score computed from
-- NC, tests, PPI, docs, calibrations, activities, readiness
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.vw_project_health AS
WITH nc_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status NOT IN ('closed','archived') AND is_deleted = false) AS nc_open,
    COUNT(*) FILTER (WHERE status NOT IN ('closed','archived') AND is_deleted = false AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS nc_overdue
  FROM public.non_conformities
  GROUP BY project_id
),
test_stats AS (
  SELECT tr.project_id,
    COUNT(*) FILTER (WHERE tr.status IN ('draft','pending','in_progress')) AS tests_pending,
    COUNT(*) FILTER (WHERE tr.pass_fail = 'fail' AND tr.created_at >= (CURRENT_DATE - INTERVAL '30 days')) AS tests_fail_30d
  FROM public.test_results tr
  GROUP BY tr.project_id
),
ppi_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status NOT IN ('approved','closed','archived') AND is_deleted = false) AS ppi_pending
  FROM public.ppi_instances
  GROUP BY project_id
),
doc_stats AS (
  SELECT d.project_id,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM public.supplier_documents sd WHERE sd.document_id = d.id AND sd.valid_to < CURRENT_DATE AND sd.status != 'expired'
    ) OR EXISTS (
      SELECT 1 FROM public.material_documents md WHERE md.document_id = d.id AND md.valid_to < CURRENT_DATE AND md.status != 'expired'
    ) OR EXISTS (
      SELECT 1 FROM public.subcontractor_documents scd WHERE scd.document_id = d.id AND scd.valid_to < CURRENT_DATE AND scd.status != 'expired'
    )) AS docs_expired
  FROM public.documents d
  WHERE d.is_deleted = false
  GROUP BY d.project_id
),
cal_stats AS (
  SELECT te.project_id,
    COUNT(*) FILTER (WHERE te.calibration_status = 'expired' OR (te.calibration_valid_until IS NOT NULL AND te.calibration_valid_until < CURRENT_DATE)) AS calibrations_expired
  FROM public.topography_equipment te
  GROUP BY te.project_id
),
activity_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status = 'blocked') AS activities_blocked
  FROM public.planning_activities
  GROUP BY project_id
),
wi_stats AS (
  SELECT project_id,
    COUNT(*) AS total_wi,
    COUNT(*) FILTER (WHERE readiness_status = 'ready') AS ready_wi
  FROM public.work_items
  WHERE is_deleted = false
  GROUP BY project_id
)
SELECT
  p.id AS project_id,
  COALESCE(nc.nc_open, 0)::int AS total_nc_open,
  COALESCE(nc.nc_overdue, 0)::int AS total_nc_overdue,
  COALESCE(ts.tests_pending, 0)::int AS total_tests_pending,
  COALESCE(ts.tests_fail_30d, 0)::int AS total_tests_fail_30d,
  COALESCE(pp.ppi_pending, 0)::int AS total_ppi_pending,
  COALESCE(ds.docs_expired, 0)::int AS total_documents_expired,
  COALESCE(cs.calibrations_expired, 0)::int AS total_calibrations_expired,
  COALESCE(acts.activities_blocked, 0)::int AS activities_blocked,
  CASE WHEN COALESCE(wi.total_wi, 0) = 0 THEN 100
    ELSE ROUND((COALESCE(wi.ready_wi, 0)::numeric / wi.total_wi) * 100)
  END::int AS readiness_ratio,
  GREATEST(0, LEAST(100,
    100
    - (COALESCE(nc.nc_overdue, 0) * 20)
    - (COALESCE(ts.tests_fail_30d, 0) * 10)
    - (COALESCE(ds.docs_expired, 0) * 5)
    - (COALESCE(cs.calibrations_expired, 0) * 5)
    - (COALESCE(acts.activities_blocked, 0) * 3)
    - (CASE WHEN COALESCE(wi.total_wi, 0) > 0 AND (COALESCE(wi.ready_wi, 0)::numeric / wi.total_wi) < 0.6 THEN 15 ELSE 0 END)
  ))::int AS health_score,
  CASE
    WHEN GREATEST(0, LEAST(100,
      100
      - (COALESCE(nc.nc_overdue, 0) * 20)
      - (COALESCE(ts.tests_fail_30d, 0) * 10)
      - (COALESCE(ds.docs_expired, 0) * 5)
      - (COALESCE(cs.calibrations_expired, 0) * 5)
      - (COALESCE(acts.activities_blocked, 0) * 3)
      - (CASE WHEN COALESCE(wi.total_wi, 0) > 0 AND (COALESCE(wi.ready_wi, 0)::numeric / wi.total_wi) < 0.6 THEN 15 ELSE 0 END)
    )) >= 80 THEN 'healthy'
    WHEN GREATEST(0, LEAST(100,
      100
      - (COALESCE(nc.nc_overdue, 0) * 20)
      - (COALESCE(ts.tests_fail_30d, 0) * 10)
      - (COALESCE(ds.docs_expired, 0) * 5)
      - (COALESCE(cs.calibrations_expired, 0) * 5)
      - (COALESCE(acts.activities_blocked, 0) * 3)
      - (CASE WHEN COALESCE(wi.total_wi, 0) > 0 AND (COALESCE(wi.ready_wi, 0)::numeric / wi.total_wi) < 0.6 THEN 15 ELSE 0 END)
    )) >= 60 THEN 'attention'
    ELSE 'critical'
  END AS health_status
FROM public.projects p
LEFT JOIN nc_stats nc ON nc.project_id = p.id
LEFT JOIN test_stats ts ON ts.project_id = p.id
LEFT JOIN ppi_stats pp ON pp.project_id = p.id
LEFT JOIN doc_stats ds ON ds.project_id = p.id
LEFT JOIN cal_stats cs ON cs.project_id = p.id
LEFT JOIN activity_stats acts ON acts.project_id = p.id
LEFT JOIN wi_stats wi ON wi.project_id = p.id
WHERE p.status != 'inactive';
