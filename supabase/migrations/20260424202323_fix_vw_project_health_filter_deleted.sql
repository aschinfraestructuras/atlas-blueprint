CREATE OR REPLACE VIEW public.vw_project_health AS
WITH nc_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status NOT IN ('closed','archived') AND is_deleted=false) AS nc_open,
    COUNT(*) FILTER (WHERE status NOT IN ('closed','archived') AND is_deleted=false AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS nc_overdue
  FROM non_conformities GROUP BY project_id
),
test_stats AS (
  SELECT project_id,
    -- CORRIGIDO: adicionar is_deleted=false
    COUNT(*) FILTER (WHERE status IN ('draft','pending','in_progress') AND is_deleted=false) AS tests_pending,
    COUNT(*) FILTER (WHERE pass_fail='fail' AND created_at >= CURRENT_DATE-30 AND is_deleted=false) AS tests_fail_30d_generic
  FROM test_results GROUP BY project_id
),
physical_tests_fail AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE overall_result='fail' AND weld_date >= CURRENT_DATE-30) AS welds_fail
  FROM weld_records GROUP BY project_id
),
physical_soil_fail AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE overall_result='inapto' AND sample_date >= CURRENT_DATE-30) AS soils_fail
  FROM soil_samples GROUP BY project_id
),
physical_compaction_fail AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE overall_result='fail' AND test_date >= CURRENT_DATE-30) AS compaction_fail
  FROM compaction_zones GROUP BY project_id
),
ppi_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status NOT IN ('approved','archived') AND is_deleted=false) AS ppi_pending
  FROM ppi_instances GROUP BY project_id
),
doc_stats AS (
  SELECT d.project_id,
    COUNT(*) FILTER (WHERE
      EXISTS (SELECT 1 FROM supplier_documents sd WHERE sd.document_id=d.id AND sd.valid_to < CURRENT_DATE AND sd.status<>'expired')
      OR EXISTS (SELECT 1 FROM material_documents md WHERE md.document_id=d.id AND md.valid_to < CURRENT_DATE AND md.status<>'expired')
      OR EXISTS (SELECT 1 FROM subcontractor_documents scd WHERE scd.document_id=d.id AND scd.valid_to < CURRENT_DATE AND scd.status<>'expired')
    ) AS docs_expired
  FROM documents d WHERE d.is_deleted=false GROUP BY d.project_id
),
cal_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE calibration_status='expired' OR (calibration_valid_until IS NOT NULL AND calibration_valid_until < CURRENT_DATE)) AS calibrations_expired
  FROM topography_equipment GROUP BY project_id
),
activity_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status='blocked') AS activities_blocked
  FROM planning_activities GROUP BY project_id
),
wi_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status<>'planned') AS total_wi_active,
    COUNT(*) FILTER (WHERE readiness_status='ready') AS ready_wi
  FROM work_items WHERE is_deleted=false GROUP BY project_id
)
SELECT
  p.id AS project_id,
  COALESCE(nc.nc_open,0)::integer AS total_nc_open,
  COALESCE(nc.nc_overdue,0)::integer AS total_nc_overdue,
  COALESCE(ts.tests_pending,0)::integer AS total_tests_pending,
  (COALESCE(ts.tests_fail_30d_generic,0)+COALESCE(wf.welds_fail,0)+COALESCE(sf.soils_fail,0)+COALESCE(cf.compaction_fail,0))::integer AS total_tests_fail_30d,
  COALESCE(pp.ppi_pending,0)::integer AS total_ppi_pending,
  COALESCE(ds.docs_expired,0)::integer AS total_documents_expired,
  COALESCE(cs.calibrations_expired,0)::integer AS total_calibrations_expired,
  COALESCE(acts.activities_blocked,0)::integer AS activities_blocked,
  CASE WHEN COALESCE(wi.total_wi_active,0)=0 THEN 100
    ELSE ROUND(COALESCE(wi.ready_wi,0)::numeric/wi.total_wi_active::numeric*100)
  END::integer AS readiness_ratio,
  GREATEST(0,LEAST(100,
    100
    - COALESCE(nc.nc_overdue,0)*20
    - (COALESCE(ts.tests_fail_30d_generic,0)+COALESCE(wf.welds_fail,0)+COALESCE(sf.soils_fail,0)+COALESCE(cf.compaction_fail,0))*10
    - COALESCE(ds.docs_expired,0)*5
    - COALESCE(cs.calibrations_expired,0)*5
    - COALESCE(acts.activities_blocked,0)*3
    - CASE WHEN COALESCE(wi.total_wi_active,0)>0 AND COALESCE(wi.ready_wi,0)::numeric/wi.total_wi_active::numeric<0.6 THEN 15 ELSE 0 END
  ))::integer AS health_score,
  CASE
    WHEN GREATEST(0,LEAST(100,100-COALESCE(nc.nc_overdue,0)*20-(COALESCE(ts.tests_fail_30d_generic,0)+COALESCE(wf.welds_fail,0)+COALESCE(sf.soils_fail,0)+COALESCE(cf.compaction_fail,0))*10-COALESCE(ds.docs_expired,0)*5-COALESCE(cs.calibrations_expired,0)*5-COALESCE(acts.activities_blocked,0)*3-CASE WHEN COALESCE(wi.total_wi_active,0)>0 AND COALESCE(wi.ready_wi,0)::numeric/wi.total_wi_active::numeric<0.6 THEN 15 ELSE 0 END))>=80 THEN 'healthy'
    WHEN GREATEST(0,LEAST(100,100-COALESCE(nc.nc_overdue,0)*20-(COALESCE(ts.tests_fail_30d_generic,0)+COALESCE(wf.welds_fail,0)+COALESCE(sf.soils_fail,0)+COALESCE(cf.compaction_fail,0))*10-COALESCE(ds.docs_expired,0)*5-COALESCE(cs.calibrations_expired,0)*5-COALESCE(acts.activities_blocked,0)*3-CASE WHEN COALESCE(wi.total_wi_active,0)>0 AND COALESCE(wi.ready_wi,0)::numeric/wi.total_wi_active::numeric<0.6 THEN 15 ELSE 0 END))>=60 THEN 'attention'
    ELSE 'critical'
  END AS health_status
FROM projects p
LEFT JOIN nc_stats nc ON nc.project_id=p.id
LEFT JOIN test_stats ts ON ts.project_id=p.id
LEFT JOIN physical_tests_fail wf ON wf.project_id=p.id
LEFT JOIN physical_soil_fail sf ON sf.project_id=p.id
LEFT JOIN physical_compaction_fail cf ON cf.project_id=p.id
LEFT JOIN ppi_stats pp ON pp.project_id=p.id
LEFT JOIN doc_stats ds ON ds.project_id=p.id
LEFT JOIN cal_stats cs ON cs.project_id=p.id
LEFT JOIN activity_stats acts ON acts.project_id=p.id
LEFT JOIN wi_stats wi ON wi.project_id=p.id
WHERE p.status<>'inactive';

GRANT SELECT ON public.vw_project_health TO authenticated;
