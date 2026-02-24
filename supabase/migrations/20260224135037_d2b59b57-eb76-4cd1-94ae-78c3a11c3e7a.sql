
-- ═══════════════════════════════════════════════════════════════════
-- Dashboard Views & Performance Indexes
-- ═══════════════════════════════════════════════════════════════════

-- ── Performance Indexes (IF NOT EXISTS) ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_work_items_project_status ON work_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_work_items_created_at ON work_items(created_at);
CREATE INDEX IF NOT EXISTS idx_ppi_instances_project_status ON ppi_instances(project_id, status);
CREATE INDEX IF NOT EXISTS idx_ppi_instances_created_at ON ppi_instances(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_project_status ON test_results(project_id, status);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_pass_fail ON test_results(project_id, pass_fail);
CREATE INDEX IF NOT EXISTS idx_non_conformities_project_status ON non_conformities(project_id, status);
CREATE INDEX IF NOT EXISTS idx_non_conformities_created_at ON non_conformities(created_at);
CREATE INDEX IF NOT EXISTS idx_non_conformities_closure_date ON non_conformities(closure_date);
CREATE INDEX IF NOT EXISTS idx_documents_project_status ON documents(project_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_suppliers_project_approval ON suppliers(project_id, approval_status);

-- ── 1. view_dashboard_summary ────────────────────────────────────
-- One row per project with pre-calculated KPIs
CREATE OR REPLACE VIEW public.view_dashboard_summary AS
SELECT
  p.id AS project_id,
  -- Work Items
  COALESCE(wi.total, 0) AS wi_total,
  COALESCE(wi.in_progress, 0) AS wi_in_progress,
  -- PPI
  COALESCE(ppi.total, 0) AS ppi_total,
  COALESCE(ppi.submitted, 0) AS ppi_submitted,
  COALESCE(ppi.approved, 0) AS ppi_approved,
  CASE WHEN COALESCE(ppi.closed_total, 0) > 0
    THEN ROUND((COALESCE(ppi.approved, 0)::numeric / ppi.closed_total) * 100, 1)
    ELSE 0 END AS ppi_conform_pct,
  -- Tests
  COALESCE(tr.total, 0) AS tests_total,
  COALESCE(tr.non_conform, 0) AS tests_non_conform,
  COALESCE(tr.completed_total, 0) AS tests_completed,
  CASE WHEN COALESCE(tr.completed_total, 0) > 0
    THEN ROUND(((tr.completed_total - COALESCE(tr.non_conform, 0))::numeric / tr.completed_total) * 100, 1)
    ELSE 0 END AS tests_conform_pct,
  -- NC
  COALESCE(nc.open_count, 0) AS nc_open,
  COALESCE(nc.closed_count, 0) AS nc_closed,
  COALESCE(nc.avg_lead_time_days, 0) AS nc_avg_lead_time,
  COALESCE(nc.avg_aging_days, 0) AS nc_avg_aging,
  -- Documents
  COALESCE(doc.in_review, 0) AS docs_in_review,
  COALESCE(doc.total, 0) AS docs_total
FROM public.projects p
-- Work Items
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress
  FROM public.work_items WHERE project_id = p.id
) wi ON true
-- PPI
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved,
    COUNT(*) FILTER (WHERE status IN ('approved', 'rejected', 'archived')) AS closed_total
  FROM public.ppi_instances WHERE project_id = p.id
) ppi ON true
-- Tests
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE pass_fail = 'fail') AS non_conform,
    COUNT(*) FILTER (WHERE status IN ('completed', 'approved', 'pass', 'fail')) AS completed_total
  FROM public.test_results WHERE project_id = p.id
) tr ON true
-- NC
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived')) AS open_count,
    COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
    COALESCE(ROUND(AVG(
      CASE WHEN status = 'closed' AND closure_date IS NOT NULL
        THEN GREATEST((closure_date - detected_at::date), 0)
        ELSE NULL END
    )::numeric, 1), 0) AS avg_lead_time_days,
    COALESCE(ROUND(AVG(
      CASE WHEN status NOT IN ('closed', 'archived')
        THEN GREATEST((CURRENT_DATE - detected_at::date), 0)
        ELSE NULL END
    )::numeric, 1), 0) AS avg_aging_days
  FROM public.non_conformities WHERE project_id = p.id
) nc ON true
-- Documents
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'in_review') AS in_review
  FROM public.documents WHERE project_id = p.id AND is_deleted = false
) doc ON true;

-- ── 2. view_nc_monthly ──────────────────────────────────────────
-- NC opened vs closed per month per project (last 12 months)
CREATE OR REPLACE VIEW public.view_nc_monthly AS
SELECT
  project_id,
  month,
  COALESCE(SUM(opened), 0) AS opened,
  COALESCE(SUM(closed), 0) AS closed
FROM (
  -- Opened NCs
  SELECT
    project_id,
    DATE_TRUNC('month', created_at)::date AS month,
    1 AS opened,
    0 AS closed
  FROM public.non_conformities
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
  UNION ALL
  -- Closed NCs
  SELECT
    project_id,
    DATE_TRUNC('month', closure_date)::date AS month,
    0 AS opened,
    1 AS closed
  FROM public.non_conformities
  WHERE closure_date IS NOT NULL
    AND closure_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')::date
) sub
GROUP BY project_id, month
ORDER BY project_id, month;

-- ── 3. view_tests_monthly ───────────────────────────────────────
-- Tests conform vs non_conform per month per project
CREATE OR REPLACE VIEW public.view_tests_monthly AS
SELECT
  project_id,
  month,
  COALESCE(SUM(conform), 0) AS conform,
  COALESCE(SUM(non_conform), 0) AS non_conform
FROM (
  SELECT
    project_id,
    DATE_TRUNC('month', date)::date AS month,
    CASE WHEN pass_fail = 'pass' THEN 1 ELSE 0 END AS conform,
    CASE WHEN pass_fail = 'fail' THEN 1 ELSE 0 END AS non_conform
  FROM public.test_results
  WHERE date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')::date
    AND status IN ('completed', 'approved', 'pass', 'fail')
) sub
GROUP BY project_id, month
ORDER BY project_id, month;

-- ── 4. view_document_metrics ────────────────────────────────────
-- Document KPIs per project
CREATE OR REPLACE VIEW public.view_document_metrics AS
SELECT
  project_id,
  doc_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'draft') AS draft,
  COUNT(*) FILTER (WHERE status = 'in_review') AS in_review,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved,
  COALESCE(ROUND(AVG(
    CASE WHEN approved_at IS NOT NULL
      THEN GREATEST(EXTRACT(EPOCH FROM (approved_at - created_at)) / 86400, 0)
      ELSE NULL END
  )::numeric, 1), 0) AS avg_approval_days
FROM public.documents
WHERE is_deleted = false
GROUP BY project_id, doc_type;

-- ── 5. view_advanced_quality_metrics ────────────────────────────
-- Tests grouped by catalog type for quality analysis
CREATE OR REPLACE VIEW public.view_advanced_quality_metrics AS
SELECT
  tr.project_id,
  tc.id AS test_catalog_id,
  tc.name AS test_name,
  tc.code AS test_code,
  tc.disciplina,
  tc.material,
  tc.standard,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE tr.pass_fail = 'pass') AS conform,
  COUNT(*) FILTER (WHERE tr.pass_fail = 'fail') AS non_conform,
  CASE WHEN COUNT(*) > 0
    THEN ROUND((COUNT(*) FILTER (WHERE tr.pass_fail = 'fail'))::numeric / COUNT(*) * 100, 1)
    ELSE 0 END AS failure_rate_pct
FROM public.test_results tr
JOIN public.tests_catalog tc ON tc.id = tr.test_id
WHERE tr.status IN ('completed', 'approved', 'pass', 'fail')
GROUP BY tr.project_id, tc.id, tc.name, tc.code, tc.disciplina, tc.material, tc.standard;

-- ── Grant access (views inherit table RLS) ──────────────────────
-- Views based on RLS-protected tables automatically respect RLS
