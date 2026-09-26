-- Recriar vw_map_points com SECURITY INVOKER (corrige aviso de segurança)
DROP VIEW IF EXISTS public.vw_map_points;

CREATE VIEW public.vw_map_points
WITH (security_invoker = true)
AS
  SELECT wi.id, 'work_item'::text AS entity_type, wi.project_id,
    wi.sector AS title, wi.obra AS subtitle, wi.disciplina, wi.status,
    wi.latitude, wi.longitude, wi.pk_inicio::text AS pk, NULL::text AS severity
  FROM public.work_items wi
  WHERE wi.is_deleted = false AND wi.latitude IS NOT NULL AND wi.longitude IS NOT NULL

  UNION ALL

  SELECT nc.id, 'non_conformity'::text, nc.project_id,
    nc.code AS title, nc.title AS subtitle, nc.category AS disciplina, nc.status,
    nc.latitude, nc.longitude, nc.location_pk AS pk, nc.severity
  FROM public.non_conformities nc
  WHERE nc.is_deleted = false AND nc.latitude IS NOT NULL AND nc.longitude IS NOT NULL

  UNION ALL

  SELECT pi.id, 'ppi'::text, pi.project_id,
    pi.code AS title, pi.code AS subtitle, NULL::text AS disciplina, pi.status,
    pi.latitude, pi.longitude, pi.pk_inicio AS pk, NULL::text AS severity
  FROM public.ppi_instances pi
  WHERE pi.is_deleted = false AND pi.latitude IS NOT NULL AND pi.longitude IS NOT NULL

  UNION ALL

  SELECT tr.id, 'test_result'::text, tr.project_id,
    COALESCE(tc.code, 'ENS') AS title, tc.name AS subtitle, tc.disciplina,
    tr.status_workflow AS status, tr.latitude, tr.longitude, tr.location_pk AS pk, NULL::text AS severity
  FROM public.test_results tr
  LEFT JOIN public.tests_catalog tc ON tc.id = tr.test_id
  WHERE tr.is_deleted = false AND tr.latitude IS NOT NULL AND tr.longitude IS NOT NULL;

GRANT SELECT ON public.vw_map_points TO authenticated;
