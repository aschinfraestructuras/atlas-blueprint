-- ============================================================
-- [1] CORRIGIR fn_qc_report_summary
-- Incluir ensaios físicos (betão/soldaduras/solos/compactação)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_qc_report_summary(
  p_project_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(

    -- Ensaios físicos (módulos novos) no período
    'tests_pass', (
      SELECT SUM(conforme) FROM public.view_physical_tests_monthly
      WHERE project_id = p_project_id
        AND month >= DATE_TRUNC('month', p_start_date)::date
        AND month <= DATE_TRUNC('month', p_end_date)::date
    ),
    'tests_fail', (
      SELECT SUM(nao_conforme) FROM public.view_physical_tests_monthly
      WHERE project_id = p_project_id
        AND month >= DATE_TRUNC('month', p_start_date)::date
        AND month <= DATE_TRUNC('month', p_end_date)::date
    ),
    'tests_pending', (
      SELECT SUM(pendente) FROM public.view_physical_tests_monthly
      WHERE project_id = p_project_id
        AND month >= DATE_TRUNC('month', p_start_date)::date
        AND month <= DATE_TRUNC('month', p_end_date)::date
    ),
    'tests_total', (
      SELECT SUM(total) FROM public.view_physical_tests_monthly
      WHERE project_id = p_project_id
        AND month >= DATE_TRUNC('month', p_start_date)::date
        AND month <= DATE_TRUNC('month', p_end_date)::date
    ),
    'tests_conform_pct', (
      SELECT CASE WHEN SUM(com_resultado) = 0 THEN 0
        ELSE ROUND(SUM(conforme)::numeric / SUM(com_resultado)::numeric * 100, 1)
      END
      FROM public.view_physical_tests_monthly
      WHERE project_id = p_project_id
        AND month >= DATE_TRUNC('month', p_start_date)::date
        AND month <= DATE_TRUNC('month', p_end_date)::date
    ),

    -- Detalhe por tipo de ensaio no período
    'concrete_summary', (
      SELECT json_build_object(
        'total', COUNT(DISTINCT cb.id),
        'tested', COUNT(cs.id) FILTER (WHERE cs.break_load_kn IS NOT NULL),
        'fail', COUNT(cs.id) FILTER (WHERE cs.pass_fail = 'fail'),
        'pending', COUNT(cs.id) FILTER (WHERE cs.break_load_kn IS NULL AND cs.mold_date <= CURRENT_DATE - 28)
      )
      FROM public.concrete_batches cb
      LEFT JOIN public.concrete_specimens cs ON cs.batch_id = cb.id
      WHERE cb.project_id = p_project_id
        AND cb.batch_date BETWEEN p_start_date AND p_end_date
    ),
    'weld_summary', (
      SELECT json_build_object(
        'total', COUNT(*),
        'pass', COUNT(*) FILTER (WHERE overall_result = 'pass'),
        'fail', COUNT(*) FILTER (WHERE overall_result = 'fail'),
        'pending_ut', COUNT(*) FILTER (WHERE has_ut = false AND overall_result = 'pending')
      )
      FROM public.weld_records
      WHERE project_id = p_project_id
        AND weld_date BETWEEN p_start_date AND p_end_date
    ),
    'soil_summary', (
      SELECT json_build_object(
        'total', COUNT(*),
        'apto', COUNT(*) FILTER (WHERE overall_result = 'apto'),
        'inapto', COUNT(*) FILTER (WHERE overall_result = 'inapto'),
        'pending', COUNT(*) FILTER (WHERE overall_result = 'pending')
      )
      FROM public.soil_samples
      WHERE project_id = p_project_id
        AND sample_date BETWEEN p_start_date AND p_end_date
    ),

    -- NCs
    'nc_open', (SELECT COUNT(*) FROM non_conformities WHERE project_id = p_project_id AND status NOT IN ('closed','archived') AND is_deleted = false),
    'nc_closed_period', (SELECT COUNT(*) FROM non_conformities WHERE project_id = p_project_id AND status = 'closed' AND closure_date BETWEEN p_start_date AND p_end_date AND is_deleted = false),

    -- Documentos
    'docs_approved', (SELECT COUNT(*) FROM documents WHERE project_id = p_project_id AND status = 'approved' AND is_deleted = false),
    'docs_review', (SELECT COUNT(*) FROM documents WHERE project_id = p_project_id AND status = 'in_review' AND is_deleted = false),

    -- Calibrações
    'expiring_total', (SELECT COUNT(*) FROM topography_equipment WHERE project_id = p_project_id AND calibration_valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + 30),

    -- Listas detalhadas
    'critical_ncs', (
      SELECT COALESCE(json_agg(json_build_object(
        'code', code, 'title', COALESCE(title, description),
        'severity', severity, 'status', status, 'detected_at', detected_at
      ) ORDER BY detected_at DESC), '[]'::json)
      FROM non_conformities
      WHERE project_id = p_project_id AND severity = 'critical'
        AND status NOT IN ('closed','archived') AND is_deleted = false
    ),
    'failed_welds', (
      SELECT COALESCE(json_agg(json_build_object(
        'code', code, 'pk', pk_location, 'date', weld_date,
        'type', weld_type, 'reason', rejection_reason
      ) ORDER BY weld_date DESC), '[]'::json)
      FROM weld_records
      WHERE project_id = p_project_id AND overall_result = 'fail'
        AND weld_date BETWEEN p_start_date AND p_end_date
    ),
    'expired_cals', (
      SELECT COALESCE(json_agg(json_build_object(
        'equipment_code', code, 'valid_until', calibration_valid_until, 'status', 'expired'
      )), '[]'::json)
      FROM topography_equipment
      WHERE project_id = p_project_id AND calibration_valid_until < CURRENT_DATE
    )

  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- ============================================================
-- [2] CORRIGIR fn_project_health_kpis
-- Bug 'BLOCKED' → 'blocked' + incluir módulos físicos
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_project_health_kpis(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'nc_open',        (SELECT COUNT(*) FROM non_conformities WHERE project_id = p_project_id AND is_deleted = false AND status IN ('open','in_progress')),
    'nc_critical',    (SELECT COUNT(*) FROM non_conformities WHERE project_id = p_project_id AND is_deleted = false AND status IN ('open','in_progress') AND severity = 'critical'),
    'ppi_pending',    (SELECT COUNT(*) FROM ppi_instances WHERE project_id = p_project_id AND is_deleted = false AND status IN ('draft','in_progress','submitted')),

    -- Ensaios pendentes - módulos físicos + sistema antigo
    'tests_pending',  (
      SELECT COUNT(*) FROM test_results
      WHERE project_id = p_project_id AND is_deleted = false
        AND status_workflow IN ('draft','in_progress','pending','submitted')
    ),
    -- Falhas reais (módulos físicos)
    'tests_fail', (
      COALESCE((SELECT COUNT(*) FROM weld_records WHERE project_id = p_project_id AND overall_result = 'fail' AND weld_date >= CURRENT_DATE - 30), 0)
      + COALESCE((SELECT COUNT(*) FROM soil_samples WHERE project_id = p_project_id AND overall_result = 'inapto' AND sample_date >= CURRENT_DATE - 30), 0)
      + COALESCE((SELECT COUNT(*) FROM compaction_zones WHERE project_id = p_project_id AND overall_result = 'fail' AND test_date >= CURRENT_DATE - 30), 0)
    ),
    -- Soldaduras pendentes de US
    'welds_pending_ut', (SELECT COUNT(*) FROM weld_records WHERE project_id = p_project_id AND has_ut = false AND overall_result = 'pending'),

    'docs_expiring',  (SELECT COUNT(*) FROM vw_deadlines WHERE project_id = p_project_id AND days_remaining BETWEEN 0 AND 7 AND severity = 'critical'),
    'docs_expired',   (SELECT COUNT(*) FROM vw_deadlines WHERE project_id = p_project_id AND days_remaining < 0),

    -- CORRIGIDO: era 'BLOCKED' (maiúsculas), agora 'blocked'
    'items_blocked',  (SELECT COUNT(*) FROM work_items WHERE project_id = p_project_id AND readiness_status = 'blocked' AND is_deleted = false),

    -- PAME materiais pendentes de aprovação
    'pame_pending',   (SELECT COUNT(*) FROM materials WHERE project_id = p_project_id AND is_deleted = false AND pame_status IN ('pending','submitted')),

    'last_activity',  (SELECT MAX(created_at) FROM audit_log WHERE project_id = p_project_id)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
