
DROP VIEW IF EXISTS public.view_pe_annexb_pf17a;
CREATE VIEW public.view_pe_annexb_pf17a AS
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
  CASE
    WHEN tc.laboratorio IS NOT NULL AND tc.laboratorio <> '' AND tc.laboratorio <> 'nenhum' THEN true
    ELSE false
  END AS requires_lab,
  COALESCE(tc.material, '') AS material_scope,
  tc.active
FROM public.tests_catalog tc
WHERE tc.active = true
ORDER BY tc.disciplina, tc.code;
