
DROP VIEW IF EXISTS public.view_pe_annexb_pf17a;

CREATE OR REPLACE VIEW public.view_pe_annexb_pf17a
WITH (security_invoker = true)
AS
SELECT
  tc.id,
  tc.project_id,
  tc.code AS test_code,
  tc.name AS test_name,
  tc.disciplina,
  tc.standards,
  tc.frequency,
  tc.acceptance_criteria,
  tc.unit,
  tc.description,
  tc.lab_required AS requires_lab,
  tc.material AS material_scope,
  tc.active
FROM public.tests_catalog tc;
