CREATE OR REPLACE FUNCTION public.fn_dashboard_summary(
  p_project_id uuid,
  p_months     integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_result jsonb;
  v_today  date := CURRENT_DATE;
  v_in30d  date := CURRENT_DATE + 30;
  v_recent jsonb;
BEGIN
  -- Actividade recente (subquery com UNION precisa de ser separada)
  SELECT jsonb_agg(r) INTO v_recent
  FROM (
    SELECT jsonb_build_object('type','nc','code',code,'label',classification,'created_at',created_at,'id',id)
    FROM non_conformities WHERE project_id = p_project_id AND is_deleted = false ORDER BY created_at DESC LIMIT 3
  ) r;

  SELECT jsonb_build_object(
    'nc_open',                 (SELECT COUNT(*) FROM non_conformities WHERE project_id = p_project_id AND is_deleted = false AND status NOT IN ('closed','archived')),
    'nc_overdue_15d',          (SELECT COUNT(*) FROM non_conformities WHERE project_id = p_project_id AND is_deleted = false AND status NOT IN ('closed','archived') AND due_date < v_today - 15),
    'tests_total',             (SELECT COUNT(*) FROM test_results WHERE project_id = p_project_id AND is_deleted = false),
    'tests_completed',         (SELECT COUNT(*) FROM test_results WHERE project_id = p_project_id AND is_deleted = false AND status_workflow = 'completed'),
    'tests_overdue',           (SELECT COUNT(*) FROM test_due_items WHERE project_id = p_project_id AND is_deleted = false AND status IN ('due','overdue') AND due_at_date < v_today),
    'ppi_total',               (SELECT COUNT(*) FROM ppi_instances WHERE project_id = p_project_id AND is_deleted = false),
    'ppi_approved',            (SELECT COUNT(*) FROM ppi_instances WHERE project_id = p_project_id AND is_deleted = false AND status = 'approved'),
    'ppi_in_progress',         (SELECT COUNT(*) FROM ppi_instances WHERE project_id = p_project_id AND is_deleted = false AND status = 'in_progress'),
    'ppi_pending_approval',    (SELECT COUNT(*) FROM ppi_instances WHERE project_id = p_project_id AND is_deleted = false AND status = 'submitted'),
    'mat_total',               (SELECT COUNT(*) FROM materials WHERE project_id = p_project_id AND is_deleted = false),
    'mat_approved',            (SELECT COUNT(*) FROM materials WHERE project_id = p_project_id AND is_deleted = false AND status = 'approved'),
    'pame_pending',            (SELECT COUNT(*) FROM materials WHERE project_id = p_project_id AND is_deleted = false AND pame_status NOT IN ('approved','rejected')),
    'emes_expiring_30d',       (SELECT COUNT(*) FROM topography_equipment WHERE project_id = p_project_id AND next_calibration_date IS NOT NULL AND next_calibration_date BETWEEN v_today AND v_in30d),
    'welds_pending_ut',        (SELECT COUNT(*) FROM weld_records WHERE project_id = p_project_id AND has_ut = false),
    'wi_in_progress',          (SELECT COUNT(*) FROM work_items WHERE project_id = p_project_id AND is_deleted = false AND status = 'in_progress'),
    'wi_blocked',              (SELECT COUNT(*) FROM work_items WHERE project_id = p_project_id AND is_deleted = false AND readiness_status = 'blocked'),
    'daily_reports_total',     (SELECT COUNT(*) FROM daily_reports WHERE project_id = p_project_id AND is_deleted = false),
    'daily_reports_validated', (SELECT COUNT(*) FROM daily_reports WHERE project_id = p_project_id AND is_deleted = false AND status = 'validated'),
    'topo_controls_total',     (SELECT COUNT(*) FROM topography_controls WHERE project_id = p_project_id),
    'topo_controls_conforme',  (SELECT COUNT(*) FROM topography_controls WHERE project_id = p_project_id AND result = 'conforme'),
    'next_audit',              (SELECT row_to_json(a) FROM (SELECT description, planned_start FROM quality_audits WHERE project_id = p_project_id AND status = 'planned' AND planned_start >= v_today ORDER BY planned_start LIMIT 1) a),
    'recent_activity',         v_recent,
    'nc_monthly', (
      SELECT jsonb_agg(jsonb_build_object('month', TO_CHAR(m,'Mon'),'open',open_c,'closed',closed_c) ORDER BY m)
      FROM (
        SELECT DATE_TRUNC('month', detected_at) AS m,
          COUNT(*) FILTER (WHERE status IN ('open','in_progress')) AS open_c,
          COUNT(*) FILTER (WHERE status IN ('closed','archived')) AS closed_c
        FROM non_conformities
        WHERE project_id = p_project_id AND is_deleted = false
          AND detected_at >= NOW() - (p_months || ' months')::interval
        GROUP BY 1
      ) s
    ),
    'tests_monthly', (
      SELECT jsonb_agg(jsonb_build_object('month',TO_CHAR(month,'Mon'),'pass',conforme,'fail',nao_conforme,'total',total) ORDER BY month)
      FROM public.view_physical_tests_monthly_total
      WHERE project_id = p_project_id
        AND month >= DATE_TRUNC('month', NOW() - (p_months || ' months')::interval)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$fn$;
