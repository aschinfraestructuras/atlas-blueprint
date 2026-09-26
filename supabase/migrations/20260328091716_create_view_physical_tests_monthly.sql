-- View que agrega ensaios físicos por mês:
-- betão (por amassada), soldaduras, solos, compactação
-- Substituição do view_tests_monthly que só usava test_results (sistema antigo)
CREATE OR REPLACE VIEW public.view_physical_tests_monthly AS
WITH months AS (
  -- Betão — 1 amassada = 1 ensaio
  SELECT
    project_id,
    date_trunc('month', batch_date::date)::date AS month,
    concrete_class AS category,
    'betao' AS tipo,
    1 AS total,
    CASE WHEN EXISTS (
      SELECT 1 FROM concrete_specimens cs
      WHERE cs.batch_id = cb.id AND cs.break_load_kn IS NOT NULL
        AND cs.cure_days = 28
    ) THEN 1 ELSE 0 END AS com_resultado,
    CASE WHEN (
      SELECT MIN(cs.strength_mpa) FROM concrete_specimens cs
      WHERE cs.batch_id = cb.id AND cs.cure_days = 28
        AND cs.strength_mpa IS NOT NULL
    ) >= (
      SUBSTRING(cb.concrete_class, 'C(\d+)')::numeric - 4
    ) THEN 1 ELSE 0 END AS conforme
  FROM concrete_batches cb

  UNION ALL

  -- Soldaduras
  SELECT
    project_id,
    date_trunc('month', weld_date)::date AS month,
    weld_type AS category,
    'soldaduras' AS tipo,
    1 AS total,
    CASE WHEN overall_result != 'pending' THEN 1 ELSE 0 END AS com_resultado,
    CASE WHEN overall_result = 'pass' THEN 1 ELSE 0 END AS conforme
  FROM weld_records

  UNION ALL

  -- Solos
  SELECT
    project_id,
    date_trunc('month', sample_date)::date AS month,
    material_type AS category,
    'solos' AS tipo,
    1 AS total,
    CASE WHEN overall_result != 'pending' THEN 1 ELSE 0 END AS com_resultado,
    CASE WHEN overall_result = 'apto' THEN 1 ELSE 0 END AS conforme
  FROM soil_samples

  UNION ALL

  -- Compactação
  SELECT
    project_id,
    date_trunc('month', test_date)::date AS month,
    material_type AS category,
    'compactacao' AS tipo,
    1 AS total,
    CASE WHEN overall_result != 'pending' THEN 1 ELSE 0 END AS com_resultado,
    CASE WHEN overall_result = 'pass' THEN 1 ELSE 0 END AS conforme
  FROM compaction_zones
)
SELECT
  project_id,
  month,
  tipo,
  SUM(total)          AS total,
  SUM(com_resultado)  AS com_resultado,
  SUM(conforme)       AS conforme,
  SUM(total) - SUM(conforme) - (SUM(total) - SUM(com_resultado)) AS nao_conforme,
  SUM(total) - SUM(com_resultado) AS pendente,
  CASE
    WHEN SUM(com_resultado) = 0 THEN NULL
    ELSE ROUND((SUM(conforme)::numeric / SUM(com_resultado)::numeric) * 100, 1)
  END AS taxa_conformidade_pct
FROM months
WHERE month >= date_trunc('month', CURRENT_DATE - INTERVAL '11 months')::date
GROUP BY project_id, month, tipo
ORDER BY project_id, month, tipo;

-- View agregada por mês (todos os tipos juntos) — para sparkline do dashboard
CREATE OR REPLACE VIEW public.view_physical_tests_monthly_total AS
SELECT
  project_id,
  month,
  SUM(total)          AS total,
  SUM(com_resultado)  AS com_resultado,
  SUM(conforme)       AS conforme,
  SUM(total) - SUM(conforme) - (SUM(total) - SUM(com_resultado)) AS nao_conforme,
  CASE
    WHEN SUM(com_resultado) = 0 THEN NULL
    ELSE ROUND((SUM(conforme)::numeric / SUM(com_resultado)::numeric) * 100, 1)
  END AS taxa_conformidade_pct
FROM public.view_physical_tests_monthly
GROUP BY project_id, month
ORDER BY project_id, month;
