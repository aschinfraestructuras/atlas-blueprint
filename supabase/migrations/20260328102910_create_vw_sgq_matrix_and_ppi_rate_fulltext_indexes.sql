-- ============================================================
-- [3] VIEW SGQ Matrix com módulos físicos reais
-- Substitui as queries individuais de test_results
-- ============================================================
CREATE OR REPLACE VIEW public.vw_sgq_matrix_summary
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,

  -- Documentos
  COUNT(DISTINCT d.id) FILTER (WHERE d.is_deleted = false)              AS docs_total,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'approved' AND d.is_deleted = false) AS docs_approved,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'in_review' AND d.is_deleted = false) AS docs_in_review,

  -- NCs
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.is_deleted = false)            AS nc_total,
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.status NOT IN ('closed','archived') AND nc.is_deleted = false) AS nc_open,
  COUNT(DISTINCT nc.id) FILTER (WHERE nc.status = 'closed' AND nc.is_deleted = false) AS nc_closed,

  -- PPIs
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.is_deleted = false)            AS ppi_total,
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.status = 'approved' AND pi.is_deleted = false) AS ppi_completed,
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.status IN ('draft','in_progress') AND pi.is_deleted = false) AS ppi_pending,

  -- Materiais
  COUNT(DISTINCT m.id) FILTER (WHERE m.is_deleted = false)              AS materials_total,
  COUNT(DISTINCT m.id) FILTER (WHERE m.pame_status = 'approved' AND m.is_deleted = false) AS materials_approved,
  COUNT(DISTINCT m.id) FILTER (WHERE m.pame_status IN ('pending','submitted') AND m.is_deleted = false) AS materials_pending,

  -- Calibrações de equipamento
  COUNT(DISTINCT ec.id)                                                 AS calibrations_total,
  COUNT(DISTINCT ec.id) FILTER (WHERE ec.status = 'valid')             AS calibrations_valid,
  COUNT(DISTINCT ec.id) FILTER (WHERE ec.status = 'expired' OR ec.valid_until < CURRENT_DATE) AS calibrations_expired,

  -- Ensaios físicos (módulos novos — não test_results antigo)
  (SELECT COALESCE(SUM(total),0) FROM public.view_physical_tests_monthly WHERE project_id = p.id
   AND month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')::date)   AS tests_total,
  (SELECT COALESCE(SUM(conforme),0) FROM public.view_physical_tests_monthly WHERE project_id = p.id
   AND month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')::date)   AS tests_pass,
  (SELECT COALESCE(SUM(nao_conforme),0) FROM public.view_physical_tests_monthly WHERE project_id = p.id
   AND month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')::date)   AS tests_fail,

  -- Auditorias
  COUNT(DISTINCT qa.id)                                                 AS audits_total,
  COUNT(DISTINCT qa.id) FILTER (WHERE qa.status = 'completed')         AS audits_completed,
  COUNT(DISTINCT qa.id) FILTER (WHERE qa.status = 'planned')           AS audits_planned,

  -- Formação
  COUNT(DISTINCT ts.id)                                                 AS training_total,
  COALESCE(SUM(ts.attendee_count), 0)                                  AS training_attendees,

  -- Subempreiteiros
  COUNT(DISTINCT sub.id) FILTER (WHERE sub.is_deleted = false)         AS subcontractors_total,
  COUNT(DISTINCT sub.id) FILTER (WHERE sub.documentation_status = 'complete' AND sub.is_deleted = false) AS subcontractors_ok

FROM public.projects p
LEFT JOIN public.documents d             ON d.project_id = p.id
LEFT JOIN public.non_conformities nc     ON nc.project_id = p.id
LEFT JOIN public.ppi_instances pi        ON pi.project_id = p.id
LEFT JOIN public.materials m             ON m.project_id = p.id
LEFT JOIN public.equipment_calibrations ec ON ec.project_id = p.id
LEFT JOIN public.quality_audits qa       ON qa.project_id = p.id
LEFT JOIN public.training_sessions ts    ON ts.project_id = p.id
LEFT JOIN public.subcontractors sub      ON sub.project_id = p.id
GROUP BY p.id;

-- ============================================================
-- [4] VIEW taxa de aprovação por template PPI
-- Útil para identificar templates com mais problemas
-- ============================================================
CREATE OR REPLACE VIEW public.vw_ppi_template_stats
WITH (security_invoker = true)
AS
SELECT
  pt.project_id,
  pt.id AS template_id,
  pt.code AS template_code,
  pt.title AS template_title,
  pt.disciplina,
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.is_deleted = false)                          AS instances_total,
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.status = 'approved' AND pi.is_deleted = false) AS instances_approved,
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.status = 'rejected' AND pi.is_deleted = false) AS instances_rejected,
  COUNT(DISTINCT pi.id) FILTER (WHERE pi.status IN ('draft','in_progress') AND pi.is_deleted = false) AS instances_pending,
  COUNT(DISTINCT pii.id) FILTER (WHERE pii.result = 'fail')                           AS items_fail_total,
  COUNT(DISTINCT pii.id) FILTER (WHERE pii.result = 'pass')                           AS items_pass_total,
  CASE WHEN COUNT(DISTINCT pi.id) FILTER (WHERE pi.is_deleted = false AND pi.status IN ('approved','rejected')) > 0
    THEN ROUND(
      COUNT(DISTINCT pi.id) FILTER (WHERE pi.status = 'approved' AND pi.is_deleted = false)::numeric /
      COUNT(DISTINCT pi.id) FILTER (WHERE pi.is_deleted = false AND pi.status IN ('approved','rejected'))::numeric * 100, 1
    )
    ELSE NULL
  END AS approval_rate_pct,
  ROUND(AVG(EXTRACT(EPOCH FROM (pi.approved_at - pi.opened_at))/86400) FILTER (
    WHERE pi.status = 'approved' AND pi.approved_at IS NOT NULL AND pi.is_deleted = false
  ), 1) AS avg_cycle_days
FROM public.ppi_templates pt
LEFT JOIN public.ppi_instances pi  ON pi.template_id = pt.id
LEFT JOIN public.ppi_instance_items pii ON pii.instance_id = pi.id
WHERE pt.is_active = true
GROUP BY pt.project_id, pt.id, pt.code, pt.title, pt.disciplina
ORDER BY instances_total DESC;

-- ============================================================
-- [5] ÍNDICES FULL-TEXT para pesquisa rápida
-- Quando a BD crescer para milhares de registos,
-- a pesquisa por texto vai ser muito mais rápida
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_materials_name_fts
  ON public.materials USING GIN (to_tsvector('portuguese', name))
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_nc_description_fts
  ON public.non_conformities USING GIN (to_tsvector('portuguese', description))
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_work_items_parte_fts
  ON public.work_items USING GIN (to_tsvector('portuguese', COALESCE(parte,'') || ' ' || COALESCE(elemento,'')))
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_documents_title_fts
  ON public.documents USING GIN (to_tsvector('portuguese', title))
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_suppliers_name_fts
  ON public.suppliers USING GIN (to_tsvector('portuguese', name))
  WHERE is_deleted = false;
