
DROP FUNCTION IF EXISTS public.fn_monthly_kpi_autofill(uuid, date);

CREATE FUNCTION public.fn_monthly_kpi_autofill(
  p_project_id uuid,
  p_reference_month date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month_start date;
  v_month_end date;
  v_tests_total int;
  v_tests_pass int;
  v_nc_open int;
  v_nc_closed int;
  v_hp_total int;
  v_hp_approved int;
  v_mat_approved int;
  v_mat_pending int;
  v_ppi_completed int;
  v_emes_expiring int;
  v_pass_rate numeric;
BEGIN
  v_month_start := date_trunc('month', p_reference_month)::date;
  v_month_end := (v_month_start + interval '1 month')::date;

  SELECT count(*), count(*) FILTER (WHERE pass_fail = 'pass' OR tr.status = 'approved')
  INTO v_tests_total, v_tests_pass
  FROM test_results tr
  WHERE tr.project_id = p_project_id
    AND tr.date >= v_month_start AND tr.date < v_month_end;

  v_pass_rate := CASE WHEN v_tests_total > 0 THEN round((v_tests_pass::numeric / v_tests_total) * 100, 1) ELSE NULL END;

  SELECT count(*) INTO v_nc_open
  FROM non_conformities nc
  WHERE nc.project_id = p_project_id
    AND nc.status IN ('open', 'in_progress', 'pending_verification');

  SELECT count(*) INTO v_nc_closed
  FROM non_conformities nc
  WHERE nc.project_id = p_project_id
    AND nc.status = 'closed'
    AND nc.closure_date >= v_month_start AND nc.closure_date < v_month_end;

  SELECT count(*), count(*) FILTER (WHERE hp.status = 'confirmed')
  INTO v_hp_total, v_hp_approved
  FROM hp_notifications hp
  WHERE hp.project_id = p_project_id
    AND hp.created_at >= v_month_start::timestamp AND hp.created_at < v_month_end::timestamp;

  SELECT count(*) FILTER (WHERE m.approval_status = 'approved'),
         count(*) FILTER (WHERE m.approval_status = 'pending')
  INTO v_mat_approved, v_mat_pending
  FROM materials m
  WHERE m.project_id = p_project_id AND m.is_deleted = false;

  SELECT count(*) INTO v_ppi_completed
  FROM ppi_instances pi
  WHERE pi.project_id = p_project_id
    AND pi.status = 'approved'
    AND pi.closed_at >= v_month_start::timestamp AND pi.closed_at < v_month_end::timestamp
    AND pi.is_deleted = false;

  SELECT count(*) INTO v_emes_expiring
  FROM topography_equipment te
  WHERE te.project_id = p_project_id
    AND te.status = 'active'
    AND te.calibration_valid_until IS NOT NULL
    AND te.calibration_valid_until BETWEEN CURRENT_DATE AND (CURRENT_DATE + interval '30 days');

  RETURN jsonb_build_object(
    'kpi_tests_pass_rate', v_pass_rate,
    'kpi_nc_open', v_nc_open,
    'kpi_nc_closed_month', v_nc_closed,
    'kpi_hp_approved', v_hp_approved,
    'kpi_hp_total', v_hp_total,
    'kpi_mat_approved', v_mat_approved,
    'kpi_mat_pending', v_mat_pending,
    'kpi_ppi_completed', v_ppi_completed,
    'kpi_emes_expiring', v_emes_expiring
  );
END;
$$;
