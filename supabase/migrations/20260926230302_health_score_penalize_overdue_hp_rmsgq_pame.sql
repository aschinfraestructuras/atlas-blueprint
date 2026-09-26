-- Índice de Alertas (health_score): passa a penalizar também pendentes vencidos
--
-- Antes só descontava falhas (NC vencidas, ensaios reprovados, documentos e
-- calibrações caducados, atividades bloqueadas, prontidão < 60%). Uma obra com
-- HPs vencidos por confirmar, RMSGQ em atraso e dezenas de materiais PAME por
-- aprovar aparecia como "Saudável 100".
--
-- Novas penalizações (cumulativas com as existentes):
--   • HP pendente com data prevista ultrapassada: −10 cada, máx. −20
--   • RMSGQ do mês anterior não emitido após dia 5: −10
--     (só a partir do 1.º mês completo de obra, como o alerta do painel)
--   • Material com PAME pendente/submetido há mais de 30 dias: −1 cada, máx. −10
-- Limiares inalterados: ≥ 80 healthy, ≥ 60 attention, < 60 critical.
-- Colunas novas no fim: hp_overdue, rmsgq_overdue, pame_pending_30d, score_breakdown.

CREATE OR REPLACE VIEW public.vw_project_health
WITH (security_invoker = true) AS
WITH nc_stats AS (
  SELECT project_id,
    count(*) FILTER (WHERE status <> ALL (ARRAY['closed','archived']) AND is_deleted = false) AS nc_open,
    count(*) FILTER (WHERE status <> ALL (ARRAY['closed','archived']) AND is_deleted = false
                     AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS nc_overdue
  FROM non_conformities GROUP BY project_id
), test_stats AS (
  SELECT project_id,
    count(*) FILTER (WHERE status = ANY (ARRAY['draft','pending','in_progress']) AND is_deleted = false) AS tests_pending,
    count(*) FILTER (WHERE pass_fail = 'fail' AND created_at >= CURRENT_DATE - 30 AND is_deleted = false) AS tests_fail_30d_generic
  FROM test_results GROUP BY project_id
), physical_tests_fail AS (
  SELECT project_id, count(*) FILTER (WHERE overall_result = 'fail' AND weld_date >= CURRENT_DATE - 30) AS welds_fail
  FROM weld_records GROUP BY project_id
), physical_soil_fail AS (
  SELECT project_id, count(*) FILTER (WHERE overall_result = 'inapto' AND sample_date >= CURRENT_DATE - 30) AS soils_fail
  FROM soil_samples GROUP BY project_id
), physical_compaction_fail AS (
  SELECT project_id, count(*) FILTER (WHERE overall_result = 'fail' AND test_date >= CURRENT_DATE - 30) AS compaction_fail
  FROM compaction_zones GROUP BY project_id
), ppi_stats AS (
  SELECT project_id,
    count(*) FILTER (WHERE status <> ALL (ARRAY['approved','archived']) AND is_deleted = false) AS ppi_pending
  FROM ppi_instances GROUP BY project_id
), doc_stats AS (
  SELECT d.project_id,
    count(*) FILTER (WHERE
      EXISTS (SELECT 1 FROM supplier_documents sd WHERE sd.document_id = d.id AND sd.valid_to < CURRENT_DATE AND sd.status <> 'expired')
      OR EXISTS (SELECT 1 FROM material_documents md WHERE md.document_id = d.id AND md.valid_to < CURRENT_DATE AND md.status <> 'expired')
      OR EXISTS (SELECT 1 FROM subcontractor_documents scd WHERE scd.document_id = d.id AND scd.valid_to < CURRENT_DATE AND scd.status <> 'expired')
    ) AS docs_expired
  FROM documents d WHERE d.is_deleted = false GROUP BY d.project_id
), cal_stats AS (
  SELECT project_id,
    count(*) FILTER (WHERE calibration_status = 'expired'
                     OR (calibration_valid_until IS NOT NULL AND calibration_valid_until < CURRENT_DATE)) AS calibrations_expired
  FROM topography_equipment GROUP BY project_id
), activity_stats AS (
  SELECT project_id, count(*) FILTER (WHERE status = 'blocked') AS activities_blocked
  FROM planning_activities GROUP BY project_id
), wi_stats AS (
  SELECT project_id,
    count(*) FILTER (WHERE status <> 'planned') AS total_wi_active,
    count(*) FILTER (WHERE readiness_status = 'ready') AS ready_wi
  FROM work_items WHERE is_deleted = false GROUP BY project_id
), hp_stats AS (
  SELECT project_id, count(*) AS hp_overdue
  FROM hp_notifications
  WHERE status = 'pending' AND planned_datetime < now()
    AND is_voided IS NOT TRUE AND is_deleted IS NOT TRUE
  GROUP BY project_id
), pame_stats AS (
  SELECT project_id, count(*) AS pame_pending_30d
  FROM materials
  WHERE is_deleted = false AND pame_status IN ('pending','submitted')
    AND COALESCE(pame_submitted_at, submitted_at, created_at) < now() - interval '30 days'
  GROUP BY project_id
), base AS (
  SELECT p.id AS project_id,
    COALESCE(nc.nc_open, 0) AS nc_open,
    COALESCE(nc.nc_overdue, 0) AS nc_overdue,
    COALESCE(ts.tests_pending, 0) AS tests_pending,
    COALESCE(ts.tests_fail_30d_generic, 0) + COALESCE(wf.welds_fail, 0)
      + COALESCE(sf.soils_fail, 0) + COALESCE(cf.compaction_fail, 0) AS tests_fail_30d,
    COALESCE(pp.ppi_pending, 0) AS ppi_pending,
    COALESCE(ds.docs_expired, 0) AS docs_expired,
    COALESCE(cs.calibrations_expired, 0) AS calibrations_expired,
    COALESCE(acts.activities_blocked, 0) AS activities_blocked,
    COALESCE(wi.total_wi_active, 0) AS total_wi_active,
    COALESCE(wi.ready_wi, 0) AS ready_wi,
    COALESCE(hp.hp_overdue, 0) AS hp_overdue,
    COALESCE(pm.pame_pending_30d, 0) AS pame_pending_30d,
    (
      p.start_date IS NOT NULL
      AND CURRENT_DATE > (date_trunc('month', CURRENT_DATE)::date + 4)
      AND CURRENT_DATE >= (date_trunc('month', p.start_date)::date + interval '1 month' + interval '4 days')::date
      AND NOT EXISTS (
        SELECT 1 FROM monthly_quality_reports mqr
        WHERE mqr.project_id = p.id
          AND mqr.status <> 'draft'
          AND mqr.is_deleted IS NOT TRUE
          AND mqr.reference_month >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date
          AND mqr.reference_month < date_trunc('month', CURRENT_DATE)::date
      )
    ) AS rmsgq_overdue
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
  LEFT JOIN hp_stats hp ON hp.project_id = p.id
  LEFT JOIN pame_stats pm ON pm.project_id = p.id
  WHERE p.status <> 'inactive'
), penalties AS (
  SELECT b.*,
    b.nc_overdue * 20 AS pen_nc,
    b.tests_fail_30d * 10 AS pen_tests,
    b.docs_expired * 5 AS pen_docs,
    b.calibrations_expired * 5 AS pen_cal,
    b.activities_blocked * 3 AS pen_blocked,
    CASE WHEN b.total_wi_active > 0 AND b.ready_wi::numeric / b.total_wi_active < 0.6 THEN 15 ELSE 0 END AS pen_readiness,
    LEAST(b.hp_overdue * 10, 20) AS pen_hp,
    CASE WHEN b.rmsgq_overdue THEN 10 ELSE 0 END AS pen_rmsgq,
    LEAST(b.pame_pending_30d, 10) AS pen_pame
  FROM base b
), scored AS (
  SELECT pe.*,
    GREATEST(0, LEAST(100, 100 - pen_nc - pen_tests - pen_docs - pen_cal - pen_blocked
                          - pen_readiness - pen_hp - pen_rmsgq - pen_pame))::integer AS score
  FROM penalties pe
)
SELECT
  project_id,
  nc_open::integer AS total_nc_open,
  nc_overdue::integer AS total_nc_overdue,
  tests_pending::integer AS total_tests_pending,
  tests_fail_30d::integer AS total_tests_fail_30d,
  ppi_pending::integer AS total_ppi_pending,
  docs_expired::integer AS total_documents_expired,
  calibrations_expired::integer AS total_calibrations_expired,
  activities_blocked::integer AS activities_blocked,
  (CASE WHEN total_wi_active = 0 THEN 100::numeric
        ELSE round(ready_wi::numeric / total_wi_active::numeric * 100) END)::integer AS readiness_ratio,
  score AS health_score,
  CASE WHEN score >= 80 THEN 'healthy' WHEN score >= 60 THEN 'attention' ELSE 'critical' END AS health_status,
  hp_overdue::integer AS hp_overdue,
  rmsgq_overdue,
  pame_pending_30d::integer AS pame_pending_30d,
  jsonb_build_object(
    'nc_overdue', pen_nc, 'tests_fail', pen_tests, 'docs_expired', pen_docs,
    'calibrations_expired', pen_cal, 'activities_blocked', pen_blocked,
    'readiness', pen_readiness, 'hp_overdue', pen_hp, 'rmsgq_overdue', pen_rmsgq,
    'pame_pending', pen_pame
  ) AS score_breakdown
FROM scored;
