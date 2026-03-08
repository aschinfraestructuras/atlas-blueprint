
DROP FUNCTION IF EXISTS public.fn_qc_report_summary(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.fn_qc_report_summary(
  p_project_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_result JSON;
BEGIN
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  SELECT json_build_object(
    'tests_pass', (
      SELECT COUNT(*) FROM test_results 
      WHERE project_id = p_project_id 
        AND result_status = 'pass' 
        AND date BETWEEN p_start_date AND p_end_date
    ),
    'tests_fail', (
      SELECT COUNT(*) FROM test_results 
      WHERE project_id = p_project_id 
        AND result_status = 'fail' 
        AND date BETWEEN p_start_date AND p_end_date
    ),
    'tests_pending', (
      SELECT COUNT(*) FROM test_results 
      WHERE project_id = p_project_id 
        AND result_status NOT IN ('pass','fail') 
        AND date BETWEEN p_start_date AND p_end_date
    ),
    'nc_open', (
      SELECT COUNT(*) FROM non_conformities 
      WHERE project_id = p_project_id 
        AND status NOT IN ('closed','archived') 
        AND is_deleted = false
    ),
    'nc_closed_period', (
      SELECT COUNT(*) FROM non_conformities 
      WHERE project_id = p_project_id 
        AND status = 'closed' 
        AND closure_date BETWEEN p_start_date AND p_end_date
        AND is_deleted = false
    ),
    'docs_approved', (
      SELECT COUNT(*) FROM documents 
      WHERE project_id = p_project_id AND status = 'approved'
    ),
    'docs_review', (
      SELECT COUNT(*) FROM documents 
      WHERE project_id = p_project_id AND status = 'in_review'
    ),
    'expiring_total', (
      SELECT COUNT(*) FROM topography_equipment 
      WHERE project_id = p_project_id 
        AND calibration_valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
    ),
    'critical_ncs', (
      SELECT COALESCE(json_agg(json_build_object(
        'code', code, 'title', COALESCE(title, description),
        'severity', severity, 'status', status, 'detected_at', detected_at
      ) ORDER BY detected_at DESC), '[]'::json)
      FROM non_conformities 
      WHERE project_id = p_project_id 
        AND severity = 'critical' 
        AND status NOT IN ('closed','archived')
        AND is_deleted = false
    ),
    'failed_tests', (
      SELECT COALESCE(json_agg(json_build_object(
        'code', tr.sample_ref, 'report_number', tr.report_number,
        'test_date', tr.date, 'status', tr.result_status
      ) ORDER BY tr.date DESC), '[]'::json)
      FROM test_results tr
      WHERE tr.project_id = p_project_id 
        AND tr.result_status = 'fail'
        AND tr.date BETWEEN p_start_date AND p_end_date
    ),
    'expired_cals', (
      SELECT COALESCE(json_agg(json_build_object(
        'certificate_number', ec.certificate_number,
        'valid_until', ec.valid_until,
        'status', 'expired'
      )), '[]'::json)
      FROM equipment_calibrations ec
      JOIN topography_equipment te ON te.id = ec.equipment_id
      WHERE te.project_id = p_project_id 
        AND ec.valid_until < CURRENT_DATE
    )
  ) INTO v_result;

  RETURN v_result;
END; $$;

REVOKE ALL ON FUNCTION public.fn_qc_report_summary(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_qc_report_summary(UUID, DATE, DATE) TO authenticated;
