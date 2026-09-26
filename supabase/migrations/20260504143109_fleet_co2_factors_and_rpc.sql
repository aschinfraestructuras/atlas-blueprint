-- ══════════════════════════════════════════════════════════════════════════
-- Tabela de referência — factores CO₂ por tipo de combustível
-- Fonte: Agência Portuguesa do Ambiente / IPCC
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.fleet_co2_factors (
  fuel_type   text PRIMARY KEY,
  co2_kg_per_liter  numeric(6,4) NOT NULL,
  label_pt    text NOT NULL,
  label_es    text NOT NULL
);

INSERT INTO public.fleet_co2_factors VALUES
  ('diesel',   2.6400, 'Gasóleo',   'Diésel'),
  ('gasoline', 2.3100, 'Gasolina',  'Gasolina'),
  ('hybrid',   2.3100, 'Híbrido',   'Híbrido'),
  ('electric', 0.0000, 'Eléctrico', 'Eléctrico'),
  ('lpg',      1.6300, 'GPL',       'GLP');

ALTER TABLE public.fleet_co2_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY fleet_co2_select ON public.fleet_co2_factors
  FOR SELECT USING (true);  -- leitura pública — são dados de referência

-- ══════════════════════════════════════════════════════════════════════════
-- RPC: fn_fleet_dashboard_worker
-- Devolve KPIs do utilizador actual para o dashboard
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_fleet_dashboard_worker(
  p_user_id uuid,
  p_months  integer DEFAULT 6
)
RETURNS jsonb LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Só o próprio ou manager pode ver
  IF auth.uid() != p_user_id AND NOT fleet_is_manager() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'current_month', jsonb_build_object(
      'km_total',       COALESCE(SUM(CASE WHEN reference_month = date_trunc('month',now())::date THEN km_total END), 0),
      'liters',         COALESCE(SUM(CASE WHEN reference_month = date_trunc('month',now())::date THEN liters END), 0),
      'cost_eur',       COALESCE(SUM(CASE WHEN reference_month = date_trunc('month',now())::date THEN cost_eur END), 0),
      'co2_kg',         COALESCE(SUM(CASE WHEN reference_month = date_trunc('month',now())::date THEN co2_kg END), 0),
      'avg_consumption',COALESCE(AVG(CASE WHEN reference_month = date_trunc('month',now())::date THEN avg_consumption END), 0),
      'submitted',      COUNT(CASE WHEN reference_month = date_trunc('month',now())::date THEN 1 END) > 0
    ),
    'ytd', jsonb_build_object(
      'km_total',  COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM reference_month) = EXTRACT(YEAR FROM now()) THEN km_total END), 0),
      'liters',    COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM reference_month) = EXTRACT(YEAR FROM now()) THEN liters END), 0),
      'cost_eur',  COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM reference_month) = EXTRACT(YEAR FROM now()) THEN cost_eur END), 0),
      'co2_kg',    COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM reference_month) = EXTRACT(YEAR FROM now()) THEN co2_kg END), 0)
    ),
    'history', (
      SELECT jsonb_agg(row_to_json(h) ORDER BY h.reference_month DESC)
      FROM (
        SELECT reference_month, km_total, liters, cost_eur, co2_kg, avg_consumption, status
        FROM public.fleet_submissions
        WHERE user_id = p_user_id
        ORDER BY reference_month DESC
        LIMIT p_months
      ) h
    )
  )
  INTO v_result
  FROM public.fleet_submissions
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- RPC: fn_fleet_dashboard_manager
-- KPIs globais para o dashboard de gestão
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_fleet_dashboard_manager(
  p_months integer DEFAULT 6
)
RETURNS jsonb LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT fleet_is_manager() THEN
    RAISE EXCEPTION 'Acesso negado — apenas managers';
  END IF;

  RETURN jsonb_build_object(
    'current_month', (
      SELECT jsonb_build_object(
        'total_workers',    COUNT(DISTINCT fp.id),
        'submitted_count',  COUNT(DISTINCT fs.user_id),
        'pending_count',    COUNT(DISTINCT fp.id) - COUNT(DISTINCT fs.user_id),
        'total_km',         COALESCE(SUM(fs.km_total), 0),
        'total_liters',     COALESCE(SUM(fs.liters), 0),
        'total_cost_eur',   COALESCE(SUM(fs.cost_eur), 0),
        'total_co2_kg',     COALESCE(SUM(fs.co2_kg), 0)
      )
      FROM public.fleet_profiles fp
      LEFT JOIN public.fleet_submissions fs
        ON fs.user_id = fp.id
        AND fs.reference_month = date_trunc('month', now())::date
        AND fs.status != 'rejected'
      WHERE fp.is_active = true AND fp.role = 'worker'
    ),
    'by_month', (
      SELECT jsonb_agg(row_to_json(m) ORDER BY m.reference_month DESC)
      FROM (
        SELECT reference_month,
               COUNT(*) AS submissions,
               SUM(km_total) AS total_km,
               SUM(liters) AS total_liters,
               SUM(cost_eur) AS total_cost_eur,
               SUM(co2_kg) AS total_co2_kg,
               ROUND(AVG(avg_consumption),2) AS avg_consumption
        FROM public.fleet_submissions
        WHERE status != 'rejected'
        GROUP BY reference_month
        ORDER BY reference_month DESC
        LIMIT p_months
      ) m
    ),
    'pending_workers', (
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', fp.id,
        'full_name', fp.full_name,
        'department', fp.department,
        'plate', fv.plate
      ))
      FROM public.fleet_profiles fp
      LEFT JOIN public.fleet_vehicles fv ON fv.assigned_to = fp.id AND fv.is_active = true
      WHERE fp.is_active = true
        AND fp.role = 'worker'
        AND NOT EXISTS (
          SELECT 1 FROM public.fleet_submissions fs
          WHERE fs.user_id = fp.id
            AND fs.reference_month = date_trunc('month', now())::date
        )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_fleet_dashboard_worker(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fleet_dashboard_manager(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_fleet_dashboard_worker(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_fleet_dashboard_manager(integer) FROM PUBLIC;
