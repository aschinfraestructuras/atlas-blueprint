-- ============================================================
-- [1] BUG: fn_dashboard_summary wi_blocked usa 'BLOCKED' 
--     mas o valor real é 'blocked' (minúsculas)
--     Também: tests_monthly passa a usar módulos físicos
-- ============================================================
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
    -- CORRIGIDO: era 'BLOCKED', o valor real é 'blocked'
    'wi_blocked',           (SELECT COUNT(*) FROM work_items WHERE project_id = p_project_id AND is_deleted = false AND readiness_status = 'blocked'),
    'suppliers_pending',    (SELECT COUNT(*) FROM suppliers WHERE project_id = p_project_id AND approval_status NOT IN ('approved','rejected')),
    'suppliers_nc',         (SELECT COUNT(DISTINCT s.id) FROM suppliers s JOIN non_conformities nc ON nc.project_id = s.project_id AND nc.supplier_id = s.id WHERE s.project_id = p_project_id AND nc.status IN ('open','in_progress') AND nc.is_deleted = false),
    'materials_nc',         (SELECT COUNT(DISTINCT wim.material_id) FROM work_item_materials wim JOIN non_conformities nc ON nc.work_item_id = wim.work_item_id WHERE nc.project_id = p_project_id AND nc.status IN ('open','in_progress') AND nc.is_deleted = false),
    'nc_monthly', (
      SELECT jsonb_agg(jsonb_build_object(
        'month', TO_CHAR(m, 'Mon'), 'open', open_c, 'closed', closed_c
      ) ORDER BY m)
      FROM (
        SELECT
          DATE_TRUNC('month', detected_at) AS m,
          COUNT(*) FILTER (WHERE status IN ('open','in_progress')) AS open_c,
          COUNT(*) FILTER (WHERE status IN ('closed','verified','archived')) AS closed_c
        FROM non_conformities
        WHERE project_id = p_project_id AND is_deleted = false
          AND detected_at >= NOW() - (p_months || ' months')::interval
        GROUP BY DATE_TRUNC('month', detected_at)
      ) s
    ),
    -- MELHORADO: agora usa módulos físicos (betão+soldaduras+solos+compactação)
    'tests_monthly', (
      SELECT jsonb_agg(jsonb_build_object(
        'month', TO_CHAR(month, 'Mon'),
        'pass', conforme,
        'fail', nao_conforme,
        'pending', pendente,
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

-- ============================================================
-- [2] BUG: fn_recalc_work_item_readiness ignora módulos físicos
--     Soldaduras fail, solos inaptos, compactação fail devem 
--     bloquear o work_item tal como as NCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_recalc_work_item_readiness(p_work_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_has_open_nc        boolean;
  v_has_pending_ppi    boolean;
  v_has_pending_tests  boolean;
  v_old_status         text;
  v_new_status         text;
BEGIN
  IF p_work_item_id IS NULL THEN RETURN; END IF;

  -- NCs abertas
  SELECT EXISTS(
    SELECT 1 FROM public.non_conformities
    WHERE work_item_id = p_work_item_id
      AND status IN ('open','in_progress','pending_verification','draft')
      AND is_deleted = false
  ) INTO v_has_open_nc;

  -- PPIs por aprovar
  SELECT EXISTS(
    SELECT 1 FROM public.ppi_instances
    WHERE work_item_id = p_work_item_id
      AND status IN ('draft','in_progress','submitted')
      AND is_deleted = false
  ) INTO v_has_pending_ppi;

  -- Ensaios pendentes: test_results (antigo) + módulos físicos
  SELECT EXISTS(
    -- sistema antigo
    SELECT 1 FROM public.test_results
    WHERE work_item_id = p_work_item_id
      AND status_workflow IN ('draft','in_progress','pending','submitted')
      AND is_deleted = false
    UNION ALL
    -- soldaduras com resultado pendente ou reprovadas
    SELECT 1 FROM public.weld_records
    WHERE work_item_id = p_work_item_id
      AND overall_result IN ('fail','pending','repair_needed')
    UNION ALL
    -- solos inaptos
    SELECT 1 FROM public.soil_samples
    WHERE work_item_id = p_work_item_id
      AND overall_result = 'inapto'
    UNION ALL
    -- compactação reprovada
    SELECT 1 FROM public.compaction_zones
    WHERE work_item_id = p_work_item_id
      AND overall_result = 'fail'
  ) INTO v_has_pending_tests;

  SELECT readiness_status INTO v_old_status
  FROM public.work_items WHERE id = p_work_item_id;

  IF (v_has_open_nc OR v_has_pending_ppi OR v_has_pending_tests) THEN
    v_new_status := 'blocked';
  ELSE
    v_new_status := 'ready';
  END IF;

  UPDATE public.work_items
  SET has_open_nc       = v_has_open_nc,
      has_pending_ppi   = v_has_pending_ppi,
      has_pending_tests = v_has_pending_tests,
      readiness_status  = v_new_status,
      updated_at        = now()
  WHERE id = p_work_item_id;

  IF v_old_status IS DISTINCT FROM v_new_status THEN
    INSERT INTO public.audit_log (project_id, entity, entity_id, action, module, description, created_at)
    SELECT project_id, 'work_items', id, 'STATUS_CHANGE', 'work_items',
           'Readiness: ' || COALESCE(v_old_status,'null') || ' → ' || v_new_status, now()
    FROM public.work_items WHERE id = p_work_item_id;
  END IF;
END;
$function$;

-- Adicionar triggers para módulos físicos chamarem o recalc
DROP TRIGGER IF EXISTS trg_weld_recalc_readiness ON public.weld_records;
CREATE TRIGGER trg_weld_recalc_readiness
  AFTER INSERT OR UPDATE OF overall_result, work_item_id OR DELETE
  ON public.weld_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_recalc_readiness();

DROP TRIGGER IF EXISTS trg_soil_recalc_readiness ON public.soil_samples;
CREATE TRIGGER trg_soil_recalc_readiness
  AFTER INSERT OR UPDATE OF overall_result, work_item_id OR DELETE
  ON public.soil_samples
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_recalc_readiness();

DROP TRIGGER IF EXISTS trg_compaction_recalc_readiness ON public.compaction_zones;
CREATE TRIGGER trg_compaction_recalc_readiness
  AFTER INSERT OR UPDATE OF overall_result, work_item_id OR DELETE
  ON public.compaction_zones
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_recalc_readiness();

-- ============================================================
-- [3+4] VIEW: resumo de qualidade por work_item
--       Agrega PPIs, ensaios físicos, NCs, topografia
--       Útil para WorkItemDetailPage e exportação PDF
-- ============================================================
CREATE OR REPLACE VIEW public.vw_work_item_quality_summary
WITH (security_invoker = true)
AS
SELECT
  wi.id AS work_item_id,
  wi.project_id,
  wi.sector,
  wi.parte,
  wi.elemento,
  wi.disciplina,
  wi.status,
  wi.readiness_status,

  -- PPIs
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.is_deleted = false)                          AS ppi_total,
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.status = 'approved' AND pi.is_deleted = false) AS ppi_approved,
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.status IN ('draft','in_progress','submitted') AND pi.is_deleted = false) AS ppi_pending,

  -- NCs
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false)                          AS nc_total,
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.status NOT IN ('closed','archived') AND nc.is_deleted = false) AS nc_open,
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.severity = 'critical' AND nc.status NOT IN ('closed','archived') AND nc.is_deleted = false) AS nc_critical,

  -- Betão
  COUNT(DISTINCT cb.id)                                                                AS concrete_batches,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.break_load_kn IS NOT NULL)                   AS concrete_tested,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.pass_fail = 'fail')                          AS concrete_fail,

  -- Soldaduras
  COUNT(DISTINCT wr.id)                                                                AS welds_total,
  COUNT(DISTINCT wr.id) FILTER (WHERE wr.overall_result = 'pass')                     AS welds_pass,
  COUNT(DISTINCT wr.id) FILTER (WHERE wr.overall_result = 'fail')                     AS welds_fail,
  COUNT(DISTINCT wr.id) FILTER (WHERE wr.overall_result = 'pending')                  AS welds_pending,

  -- Solos
  COUNT(DISTINCT ss.id)                                                                AS soils_total,
  COUNT(DISTINCT ss.id) FILTER (WHERE ss.overall_result = 'apto')                     AS soils_pass,
  COUNT(DISTINCT ss.id) FILTER (WHERE ss.overall_result = 'inapto')                   AS soils_fail,

  -- Compactação
  COUNT(DISTINCT cz.id)                                                                AS compaction_total,
  COUNT(DISTINCT cz.id) FILTER (WHERE cz.overall_result = 'pass')                     AS compaction_pass,
  COUNT(DISTINCT cz.id) FILTER (WHERE cz.overall_result = 'fail')                     AS compaction_fail,

  -- Topografia
  COUNT(DISTINCT tr.id)                                                                AS topo_requests,
  COUNT(DISTINCT tc.id)                                                                AS topo_controls,
  COUNT(DISTINCT tc.id) FILTER (WHERE tc.result = 'nao_conforme')                     AS topo_fail

FROM public.work_items wi
LEFT JOIN public.ppi_instances pi       ON pi.work_item_id = wi.id
LEFT JOIN public.non_conformities nc    ON nc.work_item_id = wi.id
LEFT JOIN public.concrete_batches cb    ON cb.work_item_id = wi.id
LEFT JOIN public.concrete_specimens cs  ON cs.batch_id = cb.id
LEFT JOIN public.weld_records wr        ON wr.work_item_id = wi.id
LEFT JOIN public.soil_samples ss        ON ss.work_item_id = wi.id
LEFT JOIN public.compaction_zones cz    ON cz.work_item_id = wi.id
LEFT JOIN public.topography_requests tr ON tr.work_item_id = wi.id
LEFT JOIN public.topography_controls tc ON tc.work_item_id = wi.id
WHERE wi.is_deleted = false
GROUP BY wi.id, wi.project_id, wi.sector, wi.parte, wi.elemento,
         wi.disciplina, wi.status, wi.readiness_status;

-- ============================================================
-- [5] VIEW: conformidade betão por projecto segundo CE/NP EN 206
--     Útil para relatório mensal e secção de ensaios
-- ============================================================
CREATE OR REPLACE VIEW public.vw_concrete_conformity_ce
WITH (security_invoker = true)
AS
SELECT
  cb.project_id,
  cb.concrete_class,
  COALESCE(cb.exc_class, 'EXC2') AS exc_class,
  COUNT(DISTINCT cb.id)          AS n_amassadas,
  COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) AS n_provetes_28d,
  ROUND(AVG(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL), 2) AS fcm_28d,
  ROUND(MIN(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL), 2) AS fci_min_28d,
  ROUND(STDDEV(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL), 3) AS s_28d,
  -- fck extraído da designação (C25/30 → 25)
  (SUBSTRING(cb.concrete_class, 'C(\d+)'))::numeric AS fck_mpa,
  -- Critério NA.M aplicável
  CASE
    WHEN COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) = 0 THEN 'sem ensaios'
    WHEN COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) = 1 THEN 'NA.M n=1: fc ≥ fck-4'
    WHEN COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) = 2 THEN 'NA.M n=2: fcm ≥ fck E fci ≥ fck-4'
    WHEN COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) BETWEEN 3 AND 4 THEN 'NA.M n=3-4: fcm ≥ fck+1 E fci ≥ fck-4'
    ELSE 'NP EN 206 §8.3 n≥5'
  END AS criterio_aplicado,
  -- Resultado de conformidade
  CASE
    WHEN COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) = 0 THEN 'pendente'
    WHEN COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) = 1 THEN
      CASE WHEN MIN(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) >= (SUBSTRING(cb.concrete_class,'C(\d+)'))::numeric - 4 THEN 'conforme' ELSE 'nao_conforme' END
    WHEN COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) = 2 THEN
      CASE WHEN AVG(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) >= (SUBSTRING(cb.concrete_class,'C(\d+)'))::numeric
            AND MIN(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) >= (SUBSTRING(cb.concrete_class,'C(\d+)'))::numeric - 4
           THEN 'conforme' ELSE 'nao_conforme' END
    WHEN COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) BETWEEN 3 AND 4 THEN
      CASE WHEN AVG(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) >= (SUBSTRING(cb.concrete_class,'C(\d+)'))::numeric + 1
            AND MIN(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) >= (SUBSTRING(cb.concrete_class,'C(\d+)'))::numeric - 4
           THEN 'conforme' ELSE 'nao_conforme' END
    ELSE
      CASE WHEN AVG(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) >= (SUBSTRING(cb.concrete_class,'C(\d+)'))::numeric + 1.48 * STDDEV(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL)
            AND MIN(cs.strength_mpa) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NOT NULL) >= (SUBSTRING(cb.concrete_class,'C(\d+)'))::numeric - 4
           THEN 'conforme' ELSE 'nao_conforme' END
  END AS resultado_nam,
  -- Provetes em atraso (mold_date > 28 dias e sem resultado)
  COUNT(cs.id) FILTER (WHERE cs.cure_days = 28 AND cs.strength_mpa IS NULL AND cs.mold_date <= CURRENT_DATE - 28) AS n_provetes_atraso
FROM public.concrete_batches cb
LEFT JOIN public.concrete_specimens cs ON cs.batch_id = cb.id
GROUP BY cb.project_id, cb.concrete_class, cb.exc_class;
