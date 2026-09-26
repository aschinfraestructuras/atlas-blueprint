-- P1a: Adicionar colunas de GR ao monthly_quality_reports
ALTER TABLE monthly_quality_reports
  ADD COLUMN IF NOT EXISTS kpi_lots_received  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_lots_approved  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_lots_quarantine integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_lots_rejected  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_pame_total     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_pame_approved  integer DEFAULT 0;

-- P2: Função para gerar código GR-PF17A-NNN
CREATE OR REPLACE FUNCTION fn_next_gr_code(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_code text;
  v_next_seq     int;
  v_code         text;
BEGIN
  SELECT code INTO v_project_code FROM projects WHERE id = p_project_id;
  SELECT COALESCE(MAX(
    CASE WHEN lot_code ~ ('^GR-' || v_project_code || '-\d+$')
    THEN (regexp_match(lot_code, '\d+$'))[1]::int
    ELSE 0 END
  ), 0) + 1 INTO v_next_seq
  FROM material_lots WHERE project_id = p_project_id;
  v_code := 'GR-' || v_project_code || '-' || LPAD(v_next_seq::text, 3, '0');
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_next_gr_code(uuid) TO authenticated;

-- P1b: Actualizar fn_monthly_kpi_autofill para incluir KPIs correctos
CREATE OR REPLACE FUNCTION public.fn_monthly_kpi_autofill(p_project_id uuid, p_reference_month date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_month_start date;
  v_month_end   date;
  v_tests_total int;
  v_tests_pass  int;
  v_nc_open     int;
  v_nc_closed   int;
  v_hp_total    int;
  v_hp_approved int;
  -- PAME documental (catálogo aprovação F/IP)
  v_pame_total    int;
  v_pame_approved int;
  v_pame_pending  int;
  -- Lotes físicos (GRs / recepções em estaleiro)
  v_lots_received   int;
  v_lots_approved   int;
  v_lots_quarantine int;
  v_lots_rejected   int;
  v_ppi_completed int;
  v_emes_expiring int;
  v_pass_rate numeric;
BEGIN
  v_month_start := date_trunc('month', p_reference_month)::date;
  v_month_end   := (v_month_start + interval '1 month')::date;

  -- Ensaios do mês
  SELECT count(*),
         count(*) FILTER (WHERE result_status = 'pass' OR status_workflow = 'approved')
  INTO v_tests_total, v_tests_pass
  FROM test_results tr
  WHERE tr.project_id = p_project_id
    AND tr.is_deleted = false
    AND tr.date >= v_month_start AND tr.date < v_month_end;

  v_pass_rate := CASE WHEN v_tests_total > 0
    THEN round((v_tests_pass::numeric / v_tests_total) * 100, 1)
    ELSE NULL END;

  -- NCs abertas (acumulado)
  SELECT count(*) INTO v_nc_open
  FROM non_conformities nc
  WHERE nc.project_id = p_project_id AND nc.is_deleted = false
    AND nc.status IN ('open', 'in_progress', 'pending_verification');

  -- NCs encerradas no mês
  SELECT count(*) INTO v_nc_closed
  FROM non_conformities nc
  WHERE nc.project_id = p_project_id AND nc.is_deleted = false
    AND nc.status = 'closed'
    AND nc.closure_date >= v_month_start AND nc.closure_date < v_month_end;

  -- HPs do mês
  SELECT count(*), count(*) FILTER (WHERE hp.status = 'confirmed')
  INTO v_hp_total, v_hp_approved
  FROM hp_notifications hp
  WHERE hp.project_id = p_project_id
    AND hp.created_at >= v_month_start::timestamp AND hp.created_at < v_month_end::timestamp;

  -- PAME documental: catálogo de aprovação F/IP (todos os materiais com pame_code)
  SELECT
    count(*) FILTER (WHERE m.pame_code IS NOT NULL),
    count(*) FILTER (WHERE m.pame_code IS NOT NULL AND m.pame_status = 'approved'),
    count(*) FILTER (WHERE m.pame_code IS NOT NULL AND m.pame_status IN ('pending','submitted','in_review'))
  INTO v_pame_total, v_pame_approved, v_pame_pending
  FROM materials m
  WHERE m.project_id = p_project_id AND m.is_deleted = false;

  -- Lotes físicos (GRs): recepções em estaleiro (acumulado)
  SELECT
    count(*),
    count(*) FILTER (WHERE ml.reception_status = 'approved'),
    count(*) FILTER (WHERE ml.reception_status IN ('pending','quarantine','retido')),
    count(*) FILTER (WHERE ml.reception_status = 'rejected')
  INTO v_lots_received, v_lots_approved, v_lots_quarantine, v_lots_rejected
  FROM material_lots ml
  WHERE ml.project_id = p_project_id AND ml.is_deleted = false;

  -- PPIs aprovadas no mês
  SELECT count(*) INTO v_ppi_completed
  FROM ppi_instances pi
  WHERE pi.project_id = p_project_id AND pi.status = 'approved' AND pi.is_deleted = false
    AND pi.closed_at >= v_month_start::timestamp AND pi.closed_at < v_month_end::timestamp;

  -- EMEs a expirar
  SELECT count(*) INTO v_emes_expiring
  FROM topography_equipment te
  WHERE te.project_id = p_project_id AND te.status = 'active'
    AND te.calibration_valid_until IS NOT NULL
    AND te.calibration_valid_until BETWEEN CURRENT_DATE AND (CURRENT_DATE + interval '30 days');

  RETURN jsonb_build_object(
    'kpi_tests_pass_rate',   v_pass_rate,
    'kpi_nc_open',           v_nc_open,
    'kpi_nc_closed_month',   v_nc_closed,
    'kpi_hp_approved',       v_hp_approved,
    'kpi_hp_total',          v_hp_total,
    -- PAME documental (catálogo F/IP)
    'kpi_mat_approved',      v_pame_approved,
    'kpi_mat_pending',       v_pame_pending,
    'kpi_pame_total',        v_pame_total,
    'kpi_pame_approved',     v_pame_approved,
    -- Lotes físicos (GRs)
    'kpi_lots_received',     v_lots_received,
    'kpi_lots_approved',     v_lots_approved,
    'kpi_lots_quarantine',   v_lots_quarantine,
    'kpi_lots_rejected',     v_lots_rejected,
    -- Outros
    'kpi_ppi_completed',     v_ppi_completed,
    'kpi_emes_expiring',     v_emes_expiring
  );
END;
$function$;
