CREATE OR REPLACE FUNCTION public.fn_dashboard_summary(
  p_project_id uuid,
  p_months integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'nc_open',              (SELECT COUNT(*) FROM non_conformities WHERE project_id = p_project_id AND is_deleted = false AND status IN ('open','in_progress')),
    'nc_aging_avg',         (SELECT ROUND(AVG(CURRENT_DATE - detected_at::date)) FROM non_conformities WHERE project_id = p_project_id AND is_deleted = false AND status IN ('open','in_progress')),
    'tests_fail',           (SELECT COUNT(*) FROM test_results WHERE project_id = p_project_id AND pass_fail = 'fail'),
    'tests_total',          (SELECT COUNT(*) FROM test_results WHERE project_id = p_project_id),
    'tests_conform_pct',    (SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE pass_fail = 'pass') / COUNT(*)) END FROM test_results WHERE project_id = p_project_id),
    'ppi_conform_pct',      (SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'approved') / COUNT(*)) END FROM ppi_instances WHERE project_id = p_project_id AND is_deleted = false),
    'ppi_pending_approval', (SELECT COUNT(*) FROM ppi_instances WHERE project_id = p_project_id AND is_deleted = false AND status = 'submitted'),
    'docs_expired',         (SELECT COUNT(*) FROM vw_deadlines WHERE project_id = p_project_id AND days_remaining < 0),
    'docs_expiring_30',     (SELECT COUNT(*) FROM vw_deadlines WHERE project_id = p_project_id AND days_remaining BETWEEN 0 AND 30),
    'docs_review',          (SELECT COUNT(*) FROM documents WHERE project_id = p_project_id AND is_deleted = false AND status = 'in_review'),
    'wi_active',            (SELECT COUNT(*) FROM work_items WHERE project_id = p_project_id AND is_deleted = false AND status = 'in_progress'),
    'wi_blocked',           (SELECT COUNT(*) FROM work_items WHERE project_id = p_project_id AND is_deleted = false AND readiness_status = 'blocked'),
    'suppliers_pending',    (SELECT COUNT(*) FROM suppliers WHERE project_id = p_project_id AND approval_status NOT IN ('approved','rejected')),
    'suppliers_nc',         (SELECT COUNT(DISTINCT s.id) FROM suppliers s JOIN non_conformities nc ON nc.project_id = s.project_id AND nc.supplier_id = s.id WHERE s.project_id = p_project_id AND nc.status IN ('open','in_progress') AND nc.is_deleted = false),
    'materials_nc',         (SELECT COUNT(DISTINCT wim.material_id) FROM work_item_materials wim JOIN non_conformities nc ON nc.work_item_id = wim.work_item_id WHERE nc.project_id = p_project_id AND nc.status IN ('open','in_progress') AND nc.is_deleted = false),
    'nc_monthly', (
      SELECT jsonb_agg(jsonb_build_object('month', TO_CHAR(m, 'Mon'), 'open', open_c, 'closed', closed_c) ORDER BY m)
      FROM (
        SELECT DATE_TRUNC('month', detected_at) AS m,
          COUNT(*) FILTER (WHERE status IN ('open','in_progress')) AS open_c,
          COUNT(*) FILTER (WHERE status IN ('closed','verified','archived')) AS closed_c
        FROM non_conformities
        WHERE project_id = p_project_id AND is_deleted = false
          AND detected_at >= NOW() - (p_months || ' months')::interval
        GROUP BY DATE_TRUNC('month', detected_at)
      ) s
    ),
    -- Usa view_physical_tests_monthly_total (betão+soldaduras+solos+compactação)
    'tests_monthly', (
      SELECT jsonb_agg(jsonb_build_object(
        'month', TO_CHAR(month, 'Mon'),
        'pass', conforme,
        'fail', nao_conforme,
        'total', total
      ) ORDER BY month)
      FROM public.view_physical_tests_monthly_total
      WHERE project_id = p_project_id
        AND month >= DATE_TRUNC('month', NOW() - (p_months || ' months')::interval)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
