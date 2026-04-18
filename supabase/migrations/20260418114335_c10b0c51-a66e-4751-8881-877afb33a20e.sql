-- ─────────────────────────────────────────────────────────────────────────
-- MQT Tier 1 — Vista de Cobertura SGQ (correção de tipos)
-- ─────────────────────────────────────────────────────────────────────────

-- Função (text): converte "32+653" → 32653 metros
CREATE OR REPLACE FUNCTION public.fn_pk_to_meters(pk text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  m text[];
BEGIN
  IF pk IS NULL OR pk = '' THEN
    RETURN NULL;
  END IF;
  m := regexp_match(pk, '(\d{1,4})\+(\d{1,3})');
  IF m IS NULL THEN
    -- Pode ser já um número puro
    BEGIN
      RETURN floor(pk::numeric)::int;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  RETURN (m[1])::int * 1000 + (m[2])::int;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Sobrecarga (numeric): assume que já está em metros
CREATE OR REPLACE FUNCTION public.fn_pk_to_meters(pk numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN pk IS NULL THEN NULL ELSE floor(pk)::int END;
$$;

COMMENT ON FUNCTION public.fn_pk_to_meters(text)    IS 'Converte PK textual ("32+653") em metros.';
COMMENT ON FUNCTION public.fn_pk_to_meters(numeric) IS 'PK numérico já em metros — devolve floor.';

-- ─────────────────────────────────────────────────────────────────────────
-- Vista de cobertura
-- ─────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.vw_mqt_quality_coverage;

CREATE VIEW public.vw_mqt_quality_coverage
WITH (security_invoker = true)
AS
WITH mqt_leaf AS (
  SELECT
    m.id                                AS mqt_item_id,
    m.project_id,
    m.code_rubrica,
    m.familia,
    m.designacao,
    m.unidade,
    m.quantidade,
    m.pk_inicio_mqt,
    m.pk_fim_mqt,
    public.fn_pk_to_meters(m.pk_inicio_mqt) AS pk_ini_m,
    COALESCE(
      public.fn_pk_to_meters(m.pk_fim_mqt),
      public.fn_pk_to_meters(m.pk_inicio_mqt)
    ) AS pk_fim_m
  FROM public.mqt_items m
  WHERE m.is_leaf = true
),
ppi_counts AS (
  SELECT
    l.mqt_item_id,
    COUNT(DISTINCT p.id)                                                              AS ppi_total,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('approved','closed','completed')) AS ppi_approved
  FROM mqt_leaf l
  LEFT JOIN public.ppi_instances p
    ON p.project_id = l.project_id
   AND COALESCE(p.is_deleted, false) = false
   AND l.pk_ini_m IS NOT NULL
   AND public.fn_pk_to_meters(p.pk_inicio) IS NOT NULL
   AND public.fn_pk_to_meters(p.pk_inicio) <= l.pk_fim_m
   AND COALESCE(public.fn_pk_to_meters(p.pk_fim), public.fn_pk_to_meters(p.pk_inicio)) >= l.pk_ini_m
  GROUP BY l.mqt_item_id
),
test_counts AS (
  SELECT
    l.mqt_item_id,
    COUNT(DISTINCT t.id)                                  AS tests_total,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pass') AS tests_pass,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'fail') AS tests_fail
  FROM mqt_leaf l
  LEFT JOIN public.test_results t
    ON t.project_id = l.project_id
   AND COALESCE(t.is_deleted, false) = false
   AND l.pk_ini_m IS NOT NULL
   AND public.fn_pk_to_meters(t.pk_inicio) IS NOT NULL
   AND public.fn_pk_to_meters(t.pk_inicio) <= l.pk_fim_m
   AND COALESCE(public.fn_pk_to_meters(t.pk_fim), public.fn_pk_to_meters(t.pk_inicio)) >= l.pk_ini_m
  GROUP BY l.mqt_item_id
),
nc_counts AS (
  SELECT
    l.mqt_item_id,
    COUNT(DISTINCT n.id)                                                          AS nc_total,
    COUNT(DISTINCT n.id) FILTER (WHERE n.status IN ('open','in_progress','draft')) AS nc_open
  FROM mqt_leaf l
  LEFT JOIN public.work_items w
    ON w.project_id = l.project_id
   AND COALESCE(w.is_deleted, false) = false
   AND l.pk_ini_m IS NOT NULL
   AND public.fn_pk_to_meters(w.pk_inicio) IS NOT NULL
   AND public.fn_pk_to_meters(w.pk_inicio) <= l.pk_fim_m
   AND COALESCE(public.fn_pk_to_meters(w.pk_fim), public.fn_pk_to_meters(w.pk_inicio)) >= l.pk_ini_m
  LEFT JOIN public.non_conformities n
    ON n.work_item_id = w.id
   AND COALESCE(n.is_deleted, false) = false
  GROUP BY l.mqt_item_id
)
SELECT
  l.mqt_item_id,
  l.project_id,
  l.code_rubrica,
  l.familia,
  l.designacao,
  l.unidade,
  l.quantidade,
  l.pk_inicio_mqt,
  l.pk_fim_mqt,
  COALESCE(pc.ppi_total, 0)      AS ppi_total,
  COALESCE(pc.ppi_approved, 0)   AS ppi_approved,
  COALESCE(tc.tests_total, 0)    AS tests_total,
  COALESCE(tc.tests_pass, 0)     AS tests_pass,
  COALESCE(tc.tests_fail, 0)     AS tests_fail,
  COALESCE(nc.nc_total, 0)       AS nc_total,
  COALESCE(nc.nc_open, 0)        AS nc_open,
  CASE
    WHEN COALESCE(nc.nc_open, 0) > 0                                      THEN 'critical'
    WHEN COALESCE(pc.ppi_approved, 0) > 0                                 THEN 'covered'
    WHEN COALESCE(pc.ppi_total, 0) > 0 OR COALESCE(tc.tests_total, 0) > 0 THEN 'partial'
    ELSE 'uncovered'
  END AS coverage_status,
  (l.pk_ini_m IS NOT NULL) AS has_pk
FROM mqt_leaf l
LEFT JOIN ppi_counts  pc ON pc.mqt_item_id = l.mqt_item_id
LEFT JOIN test_counts tc ON tc.mqt_item_id = l.mqt_item_id
LEFT JOIN nc_counts   nc ON nc.mqt_item_id = l.mqt_item_id;

COMMENT ON VIEW public.vw_mqt_quality_coverage IS
  'Cobertura SGQ por rubrica MQT folha: cruza PPIs, ensaios e NCs via sobreposição de PKs. Read-only.';

GRANT SELECT ON public.vw_mqt_quality_coverage TO authenticated;