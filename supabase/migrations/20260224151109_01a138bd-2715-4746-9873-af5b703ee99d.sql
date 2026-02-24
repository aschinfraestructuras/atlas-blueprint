
-- supplier_evaluations: quality scoring and qualification history
CREATE TABLE public.supplier_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  eval_date date NOT NULL DEFAULT CURRENT_DATE,
  criteria jsonb NOT NULL DEFAULT '{}',
  score numeric(5,2) CHECK (score >= 0 AND score <= 100),
  result text NOT NULL DEFAULT 'pending' CHECK (result IN ('approved','pending','rejected','conditional')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "se_select" ON public.supplier_evaluations FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "se_insert" ON public.supplier_evaluations FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "se_update" ON public.supplier_evaluations FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "se_delete" ON public.supplier_evaluations FOR DELETE USING (is_project_admin(auth.uid(), project_id));

CREATE INDEX idx_supplier_evals_project ON public.supplier_evaluations(project_id);
CREATE INDEX idx_supplier_evals_supplier ON public.supplier_evaluations(supplier_id);

-- Update the view_supplier_detail_metrics to include evaluations
DROP VIEW IF EXISTS public.view_supplier_detail_metrics;
CREATE OR REPLACE VIEW public.view_supplier_detail_metrics
WITH (security_invoker = on) AS
SELECT
  s.id AS supplier_id,
  s.project_id,
  COALESCE((SELECT count(*) FROM public.supplier_documents sd WHERE sd.supplier_id = s.id), 0) AS docs_total,
  COALESCE((SELECT count(*) FROM public.supplier_documents sd WHERE sd.supplier_id = s.id AND sd.valid_to < CURRENT_DATE), 0) AS docs_expired,
  COALESCE((SELECT count(*) FROM public.supplier_documents sd WHERE sd.supplier_id = s.id AND sd.valid_to BETWEEN CURRENT_DATE AND CURRENT_DATE + 30), 0) AS docs_expiring_30d,
  COALESCE((SELECT count(*) FROM public.supplier_materials sm WHERE sm.supplier_id = s.id), 0) AS materials_count,
  COALESCE((SELECT count(*) FROM public.test_results tr WHERE tr.supplier_id = s.id), 0) AS tests_total,
  COALESCE((SELECT count(*) FROM public.test_results tr WHERE tr.supplier_id = s.id AND tr.pass_fail = 'fail'), 0) AS tests_nonconform,
  COALESCE((SELECT count(*) FROM public.non_conformities nc WHERE nc.supplier_id = s.id AND nc.status NOT IN ('closed', 'archived')), 0) AS nc_open_count,
  COALESCE((SELECT count(*) FROM public.supplier_evaluations se WHERE se.supplier_id = s.id), 0) AS evals_total,
  (SELECT se.score FROM public.supplier_evaluations se WHERE se.supplier_id = s.id ORDER BY se.eval_date DESC LIMIT 1) AS latest_score,
  (SELECT se.result FROM public.supplier_evaluations se WHERE se.supplier_id = s.id ORDER BY se.eval_date DESC LIMIT 1) AS latest_eval_result
FROM public.suppliers s;
