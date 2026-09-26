-- ============================================================
-- FUNÇÃO: Auto-preencher KPIs do relatório mensal
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_monthly_kpi_autofill(
  p_project_id uuid,
  p_reference_month date DEFAULT DATE_TRUNC('month', CURRENT_DATE)::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_month_start date := DATE_TRUNC('month', p_reference_month)::date;
  v_month_end   date := (DATE_TRUNC('month', p_reference_month) + INTERVAL '1 month - 1 day')::date;
  v_result      jsonb;
BEGIN
  SELECT jsonb_build_object(

    -- Taxa de conformidade de ensaios físicos no mês
    'kpi_tests_pass_rate', (
      SELECT CASE WHEN SUM(com_resultado) = 0 THEN NULL
        ELSE ROUND(SUM(conforme)::numeric / SUM(com_resultado)::numeric * 100, 1)
      END
      FROM public.view_physical_tests_monthly
      WHERE project_id = p_project_id
        AND month = v_month_start
    ),

    -- NCs abertas no final do mês
    'kpi_nc_open', (
      SELECT COUNT(*) FROM public.non_conformities
      WHERE project_id = p_project_id AND is_deleted = false
        AND status NOT IN ('closed','archived')
        AND detected_at <= v_month_end
    ),

    -- NCs fechadas no mês
    'kpi_nc_closed_month', (
      SELECT COUNT(*) FROM public.non_conformities
      WHERE project_id = p_project_id AND is_deleted = false
        AND status IN ('closed','verified')
        AND closure_date BETWEEN v_month_start AND v_month_end
    ),

    -- HPs aprovadas no mês
    'kpi_hp_approved', (
      SELECT COUNT(*) FROM public.hp_notifications
      WHERE project_id = p_project_id
        AND status = 'confirmed'
        AND confirmed_at::date BETWEEN v_month_start AND v_month_end
    ),

    -- HPs totais do mês
    'kpi_hp_total', (
      SELECT COUNT(*) FROM public.hp_notifications
      WHERE project_id = p_project_id
        AND planned_datetime::date BETWEEN v_month_start AND v_month_end
    ),

    -- Materiais aprovados no mês
    'kpi_mat_approved', (
      SELECT COUNT(*) FROM public.materials
      WHERE project_id = p_project_id AND is_deleted = false
        AND pame_status = 'approved'
        AND pame_approved_at::date BETWEEN v_month_start AND v_month_end
    ),

    -- Materiais pendentes
    'kpi_mat_pending', (
      SELECT COUNT(*) FROM public.materials
      WHERE project_id = p_project_id AND is_deleted = false
        AND pame_status IN ('pending','submitted')
    ),

    -- PPIs concluídos (aprovados) no mês
    'kpi_ppi_completed', (
      SELECT COUNT(*) FROM public.ppi_instances
      WHERE project_id = p_project_id AND is_deleted = false
        AND status = 'approved'
        AND approved_at::date BETWEEN v_month_start AND v_month_end
    ),

    -- EMEs a vencer nos próximos 30 dias
    'kpi_emes_expiring', (
      SELECT COUNT(*) FROM public.topography_equipment
      WHERE project_id = p_project_id
        AND calibration_valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
    ),

    -- Período de referência
    'month_start', v_month_start,
    'month_end',   v_month_end

  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- ============================================================
-- VIEW: Resumo da parte diária com contexto de qualidade
-- ============================================================
CREATE OR REPLACE VIEW public.vw_daily_report_context
WITH (security_invoker = true)
AS
SELECT
  dr.id AS report_id,
  dr.project_id,
  dr.report_date,
  dr.report_number,
  dr.status,
  dr.work_item_id,
  wi.sector,
  wi.parte,
  wi.elemento,
  wi.disciplina,
  wi.readiness_status,

  -- PPIs activos do elemento
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.is_deleted = false AND pi.status IN ('draft','in_progress')) AS ppi_active,
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.is_deleted = false AND pi.status = 'approved') AS ppi_approved,

  -- NCs abertas do elemento
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false AND nc.status NOT IN ('closed','archived')) AS nc_open,
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false AND nc.severity = 'critical' AND nc.status NOT IN ('closed','archived')) AS nc_critical,

  -- Ensaios em atraso do elemento
  COUNT(DISTINCT tdi.id) FILTER (WHERE tdi.is_deleted = false AND tdi.status IN ('due','overdue')) AS tests_overdue,

  -- HPs pendentes do elemento
  COUNT(DISTINCT hn.id) FILTER (WHERE hn.status = 'pending') AS hp_pending,

  -- Mão-de-obra do parte
  COUNT(DISTINCT drl.id) AS labour_rows,
  ROUND(SUM(drl.hours_worked), 1) AS total_hours,

  -- Equipamentos
  COUNT(DISTINCT dre.id) AS equipment_rows,

  -- Materiais usados
  COUNT(DISTINCT drm.id) AS materials_rows

FROM public.daily_reports dr
LEFT JOIN public.work_items wi ON wi.id = dr.work_item_id AND wi.is_deleted = false
LEFT JOIN public.ppi_instances pi ON pi.work_item_id = wi.id
LEFT JOIN public.non_conformities nc ON nc.work_item_id = wi.id
LEFT JOIN public.test_due_items tdi ON tdi.work_item_id = wi.id
LEFT JOIN public.hp_notifications hn ON hn.instance_id = pi.id
LEFT JOIN public.daily_report_labour drl ON drl.daily_report_id = dr.id
LEFT JOIN public.daily_report_equipment dre ON dre.daily_report_id = dr.id
LEFT JOIN public.daily_report_materials drm ON drm.daily_report_id = dr.id
WHERE dr.is_deleted = false
GROUP BY dr.id, dr.project_id, dr.report_date, dr.report_number, dr.status, dr.work_item_id,
  wi.sector, wi.parte, wi.elemento, wi.disciplina, wi.readiness_status;
