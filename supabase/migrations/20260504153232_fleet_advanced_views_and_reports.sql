-- ══════════════════════════════════════════════════════════════════════════
-- VIEWS AVANÇADAS PARA RELATÓRIOS
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Relatório global por mês + trabalhador (base de todos os relatórios)
CREATE OR REPLACE VIEW public.vw_fleet_report_full
WITH (security_invoker = true) AS
SELECT
  fs.id                                           AS submission_id,
  fs.reference_month,
  TO_CHAR(fs.reference_month, 'Month YYYY')       AS month_label,
  EXTRACT(YEAR  FROM fs.reference_month)::int     AS year,
  EXTRACT(MONTH FROM fs.reference_month)::int     AS month_num,
  fp.id                                           AS user_id,
  fp.full_name,
  fp.email,
  fp.department,
  fv.id                                           AS vehicle_id,
  fv.plate,
  fv.brand,
  fv.model,
  fv.brand || ' ' || fv.model || ' (' || fv.plate || ')' AS vehicle_label,
  fv.fuel_type,
  fs.km_start,
  fs.km_end,
  fs.km_total,
  fs.liters,
  fs.cost_eur,
  fs.co2_kg,
  fs.avg_consumption,
  fs.cost_per_km,
  CASE WHEN fs.liters > 0 THEN ROUND(fs.cost_eur / fs.liters, 4) END AS price_per_liter,
  fs.status,
  fs.notes,
  fs.created_at                                   AS submitted_at,
  fs.approved_at,
  ap.full_name                                    AS approved_by_name
FROM public.fleet_submissions fs
JOIN public.fleet_profiles fp  ON fp.id = fs.user_id
JOIN public.fleet_vehicles  fv ON fv.id = fs.vehicle_id
LEFT JOIN public.fleet_profiles ap ON ap.id = fs.approved_by;

-- 2. KPIs anuais por trabalhador
CREATE OR REPLACE VIEW public.vw_fleet_annual_by_worker
WITH (security_invoker = true) AS
SELECT
  EXTRACT(YEAR FROM reference_month)::int         AS year,
  user_id,
  fp.full_name,
  fp.department,
  fv.plate,
  fv.brand || ' ' || fv.model                    AS vehicle_name,
  COUNT(*)                                        AS months_submitted,
  SUM(km_total)                                   AS total_km,
  SUM(liters)                                     AS total_liters,
  SUM(cost_eur)                                   AS total_cost_eur,
  SUM(co2_kg)                                     AS total_co2_kg,
  ROUND(AVG(avg_consumption), 2)                  AS avg_consumption,
  ROUND(AVG(cost_per_km), 4)                      AS avg_cost_per_km,
  ROUND(SUM(cost_eur) / NULLIF(SUM(km_total),0) * 100, 2) AS cost_per_100km
FROM public.fleet_submissions fs
JOIN public.fleet_profiles fp  ON fp.id = fs.user_id
JOIN public.fleet_vehicles  fv ON fv.id = fs.vehicle_id
WHERE fs.status != 'rejected'
GROUP BY EXTRACT(YEAR FROM reference_month)::int,
         user_id, fp.full_name, fp.department, fv.plate, fv.brand, fv.model;

-- 3. Comparativo mensal — todos os trabalhadores lado a lado
CREATE OR REPLACE VIEW public.vw_fleet_monthly_comparison
WITH (security_invoker = true) AS
SELECT
  fs.reference_month,
  fp.full_name,
  fp.department,
  fv.plate,
  fv.fuel_type,
  fs.km_total,
  fs.liters,
  fs.cost_eur,
  fs.co2_kg,
  fs.avg_consumption,
  fs.cost_per_km,
  fs.status,
  -- ranking por KMs nesse mês
  RANK() OVER (PARTITION BY fs.reference_month ORDER BY fs.km_total DESC) AS rank_km,
  -- % do total de KMs da empresa nesse mês
  ROUND(fs.km_total::numeric /
    NULLIF(SUM(fs.km_total) OVER (PARTITION BY fs.reference_month), 0) * 100, 1
  ) AS pct_total_km
FROM public.fleet_submissions fs
JOIN public.fleet_profiles fp ON fp.id = fs.user_id
JOIN public.fleet_vehicles fv ON fv.id = fs.vehicle_id
WHERE fs.status != 'rejected';

-- 4. Resumo por departamento
CREATE OR REPLACE VIEW public.vw_fleet_by_department
WITH (security_invoker = true) AS
SELECT
  fs.reference_month,
  fp.department,
  COUNT(DISTINCT fs.user_id)      AS workers,
  SUM(fs.km_total)                AS total_km,
  SUM(fs.liters)                  AS total_liters,
  SUM(fs.cost_eur)                AS total_cost_eur,
  SUM(fs.co2_kg)                  AS total_co2_kg,
  ROUND(AVG(fs.avg_consumption),2) AS avg_consumption
FROM public.fleet_submissions fs
JOIN public.fleet_profiles fp ON fp.id = fs.user_id
WHERE fs.status != 'rejected'
GROUP BY fs.reference_month, fp.department;

-- 5. Evolução acumulada anual (para gráfico YTD)
CREATE OR REPLACE VIEW public.vw_fleet_ytd_evolution
WITH (security_invoker = true) AS
SELECT
  fs.reference_month,
  EXTRACT(YEAR  FROM fs.reference_month)::int AS year,
  EXTRACT(MONTH FROM fs.reference_month)::int AS month_num,
  SUM(fs.km_total)    AS monthly_km,
  SUM(fs.liters)      AS monthly_liters,
  SUM(fs.cost_eur)    AS monthly_cost,
  SUM(fs.co2_kg)      AS monthly_co2,
  SUM(SUM(fs.km_total))  OVER (
    PARTITION BY EXTRACT(YEAR FROM fs.reference_month)
    ORDER BY fs.reference_month
  ) AS ytd_km,
  SUM(SUM(fs.cost_eur)) OVER (
    PARTITION BY EXTRACT(YEAR FROM fs.reference_month)
    ORDER BY fs.reference_month
  ) AS ytd_cost,
  SUM(SUM(fs.co2_kg)) OVER (
    PARTITION BY EXTRACT(YEAR FROM fs.reference_month)
    ORDER BY fs.reference_month
  ) AS ytd_co2
FROM public.fleet_submissions fs
WHERE fs.status != 'rejected'
GROUP BY fs.reference_month;

-- ══════════════════════════════════════════════════════════════════════════
-- RPC AVANÇADO — Relatório global com filtros
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_fleet_global_report(
  p_year        integer DEFAULT NULL,
  p_month       integer DEFAULT NULL,
  p_user_id     uuid    DEFAULT NULL,
  p_department  text    DEFAULT NULL,
  p_fuel_type   text    DEFAULT NULL,
  p_status      text    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT fleet_is_manager() THEN
    RAISE EXCEPTION 'Acesso negado — apenas managers/admin';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'summary', jsonb_build_object(
        'total_submissions',  COUNT(*),
        'total_km',           COALESCE(SUM(km_total), 0),
        'total_liters',       COALESCE(SUM(liters), 0),
        'total_cost_eur',     COALESCE(SUM(cost_eur), 0),
        'total_co2_kg',       COALESCE(SUM(co2_kg), 0),
        'avg_consumption',    ROUND(AVG(avg_consumption), 2),
        'avg_cost_per_km',    ROUND(AVG(cost_per_km), 4),
        'workers_count',      COUNT(DISTINCT user_id)
      ),
      'rows', COALESCE(jsonb_agg(
        jsonb_build_object(
          'submission_id',  submission_id,
          'month_label',    month_label,
          'reference_month',reference_month,
          'full_name',      full_name,
          'department',     department,
          'vehicle_label',  vehicle_label,
          'plate',          plate,
          'fuel_type',      fuel_type,
          'km_total',       km_total,
          'liters',         liters,
          'cost_eur',       cost_eur,
          'co2_kg',         co2_kg,
          'avg_consumption',avg_consumption,
          'cost_per_km',    cost_per_km,
          'price_per_liter',price_per_liter,
          'status',         status,
          'submitted_at',   submitted_at
        ) ORDER BY reference_month DESC, full_name
      ), '[]'::jsonb)
    )
    FROM public.vw_fleet_report_full
    WHERE
      (p_year       IS NULL OR year       = p_year)
      AND (p_month  IS NULL OR month_num  = p_month)
      AND (p_user_id IS NULL OR user_id   = p_user_id)
      AND (p_department IS NULL OR department ILIKE '%' || p_department || '%')
      AND (p_fuel_type  IS NULL OR fuel_type = p_fuel_type)
      AND (p_status     IS NULL OR status    = p_status)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_fleet_global_report(integer,integer,uuid,text,text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fleet_global_report(integer,integer,uuid,text,text,text) FROM PUBLIC;

-- ══════════════════════════════════════════════════════════════════════════
-- DADOS DE TESTE REALISTAS (6 meses de histórico para todos os workers)
-- ══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_jose uuid := '4d4bd489-7cbd-449e-af76-d10ab456d6a3';
  v_arranz uuid := '95af1634-6c78-4ccf-b775-0ee4777fba37';
  v_teste uuid := '17b8968d-76ba-45a1-b387-99576d213cc2';
  v_veh_jose uuid;
  v_veh_arranz uuid;
  v_veh_teste uuid;
BEGIN
  SELECT id INTO v_veh_jose   FROM fleet_vehicles WHERE plate='AA-00-BB';
  SELECT id INTO v_veh_arranz FROM fleet_vehicles WHERE plate='CC-11-DD';
  SELECT id INTO v_veh_teste  FROM fleet_vehicles WHERE plate='EE-22-FF';

  -- José — últimos 6 meses (já tem Mar e Abr, acrescentar Nov-Fev)
  INSERT INTO fleet_submissions (user_id,vehicle_id,reference_month,km_start,km_end,liters,cost_eur,status)
  VALUES
    (v_jose,v_veh_jose,'2025-11-01',42100,42890,63.10, 99.20,'approved'),
    (v_jose,v_veh_jose,'2025-12-01',42890,43650,58.40, 91.80,'approved'),
    (v_jose,v_veh_jose,'2026-01-01',43650,44210,41.30, 64.90,'approved'),
    (v_jose,v_veh_jose,'2026-02-01',44210,44850,47.80, 75.10,'approved')
  ON CONFLICT (user_id,vehicle_id,reference_month) DO NOTHING;

  -- Arranz — últimos 6 meses
  INSERT INTO fleet_submissions (user_id,vehicle_id,reference_month,km_start,km_end,liters,cost_eur,status)
  VALUES
    (v_arranz,v_veh_arranz,'2025-11-01',36200,37100,72.50,113.90,'approved'),
    (v_arranz,v_veh_arranz,'2025-12-01',37100,37820,58.20, 91.50,'approved'),
    (v_arranz,v_veh_arranz,'2026-01-01',37820,38540,57.90, 91.00,'approved'),
    (v_arranz,v_veh_arranz,'2026-02-01',38540,39210,53.60, 84.30,'approved'),
    (v_arranz,v_veh_arranz,'2026-03-01',39210,39980,61.80, 97.20,'approved'),
    (v_arranz,v_veh_arranz,'2026-04-01',39980,40750,62.10, 97.60,'submitted')
  ON CONFLICT (user_id,vehicle_id,reference_month) DO NOTHING;

  -- Utilizador Teste — últimos 4 meses (veículo menor, menos KMs)
  INSERT INTO fleet_submissions (user_id,vehicle_id,reference_month,km_start,km_end,liters,cost_eur,status)
  VALUES
    (v_teste,v_veh_teste,'2026-01-01',11200,11820,35.80,56.20,'approved'),
    (v_teste,v_veh_teste,'2026-02-01',11820,12310,29.40,46.20,'approved'),
    (v_teste,v_veh_teste,'2026-03-01',12310,12890,34.80,54.70,'approved'),
    (v_teste,v_veh_teste,'2026-04-01',12890,13390,30.10,47.30,'submitted')
  ON CONFLICT (user_id,vehicle_id,reference_month) DO NOTHING;
END $$;
