-- Colunas GPS
ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_description TEXT;

ALTER TABLE public.non_conformities
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE public.ppi_instances
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Índices parciais para queries geo
CREATE INDEX IF NOT EXISTS idx_work_items_geo
  ON public.work_items(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_non_conformities_geo
  ON public.non_conformities(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ppi_instances_geo
  ON public.ppi_instances(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- View unificada para o mapa
CREATE OR REPLACE VIEW public.vw_map_points AS
  SELECT
    wi.id,
    'work_item'::text            AS entity_type,
    wi.project_id,
    wi.sector                    AS title,
    wi.obra                      AS subtitle,
    wi.disciplina,
    wi.status,
    wi.latitude,
    wi.longitude,
    wi.pk_inicio::text           AS pk,
    NULL::text                   AS severity
  FROM public.work_items wi
  WHERE wi.is_deleted = false
    AND wi.latitude IS NOT NULL AND wi.longitude IS NOT NULL

  UNION ALL

  SELECT
    nc.id,
    'non_conformity'::text       AS entity_type,
    nc.project_id,
    nc.code                      AS title,
    nc.title                     AS subtitle,
    nc.category                  AS disciplina,
    nc.status,
    nc.latitude,
    nc.longitude,
    nc.location_pk               AS pk,
    nc.severity
  FROM public.non_conformities nc
  WHERE nc.is_deleted = false
    AND nc.latitude IS NOT NULL AND nc.longitude IS NOT NULL

  UNION ALL

  SELECT
    pi.id,
    'ppi'::text                  AS entity_type,
    pi.project_id,
    pi.code                      AS title,
    pi.code                      AS subtitle,
    NULL::text                   AS disciplina,
    pi.status,
    pi.latitude,
    pi.longitude,
    pi.pk_inicio                 AS pk,
    NULL::text                   AS severity
  FROM public.ppi_instances pi
  WHERE pi.is_deleted = false
    AND pi.latitude IS NOT NULL AND pi.longitude IS NOT NULL

  UNION ALL

  SELECT
    tr.id,
    'test_result'::text          AS entity_type,
    tr.project_id,
    COALESCE(tc.code, 'ENS')     AS title,
    tc.name                      AS subtitle,
    tc.disciplina,
    tr.status_workflow           AS status,
    tr.latitude,
    tr.longitude,
    tr.location_pk               AS pk,
    NULL::text                   AS severity
  FROM public.test_results tr
  LEFT JOIN public.tests_catalog tc ON tc.id = tr.test_id
  WHERE tr.is_deleted = false
    AND tr.latitude IS NOT NULL AND tr.longitude IS NOT NULL;

GRANT SELECT ON public.vw_map_points TO authenticated;
