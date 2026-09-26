-- ══════════════════════════════════════════════════════════════════════════
-- ASCH FLEET — Schema completo
-- Todas as tabelas prefixadas com fleet_ para zero conflito com Atlas
-- ══════════════════════════════════════════════════════════════════════════

-- ─── 1. PERFIS DE UTILIZADOR ─────────────────────────────────────────────
CREATE TABLE public.fleet_profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         text NOT NULL,
  email             text,
  role              text NOT NULL DEFAULT 'worker'
                    CHECK (role IN ('worker', 'manager', 'admin')),
  language          text NOT NULL DEFAULT 'pt'
                    CHECK (language IN ('pt', 'es')),
  department        text,                          -- ex: Produção, TQ, Admin
  phone             text,
  avatar_url        text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. VIATURAS ─────────────────────────────────────────────────────────
CREATE TABLE public.fleet_vehicles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate             text NOT NULL UNIQUE,           -- matrícula
  brand             text NOT NULL,                  -- marca
  model             text NOT NULL,                  -- modelo
  year              integer,
  fuel_type         text NOT NULL DEFAULT 'diesel'
                    CHECK (fuel_type IN ('diesel','gasoline','hybrid','electric','lpg')),
  -- coeficiente CO₂ em kg/litro (ou kg/kWh para eléctrico)
  co2_factor        numeric(6,4) NOT NULL DEFAULT 2.6400,
  assigned_to       uuid REFERENCES public.fleet_profiles(id) ON DELETE SET NULL,
  km_initial        integer DEFAULT 0,              -- KM aquando da atribuição
  is_active         boolean NOT NULL DEFAULT true,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. SUBMISSÕES MENSAIS ────────────────────────────────────────────────
CREATE TABLE public.fleet_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.fleet_profiles(id) ON DELETE CASCADE,
  vehicle_id        uuid NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE RESTRICT,
  -- mês de referência (sempre o dia 1 do mês, ex: 2026-05-01)
  reference_month   date NOT NULL,
  km_start          integer NOT NULL CHECK (km_start >= 0),
  km_end            integer NOT NULL CHECK (km_end >= 0),
  km_total          integer GENERATED ALWAYS AS (km_end - km_start) STORED,
  liters            numeric(8,2),                   -- null para eléctrico
  cost_eur          numeric(8,2),
  -- calculado automaticamente via trigger
  co2_kg            numeric(8,2),
  avg_consumption   numeric(5,2),                   -- L/100km
  cost_per_km       numeric(6,4),                   -- €/km
  notes             text,
  status            text NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted','approved','rejected')),
  approved_by       uuid REFERENCES public.fleet_profiles(id),
  approved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- não pode submeter o mesmo utilizador+viatura+mês duas vezes
  UNIQUE (user_id, vehicle_id, reference_month),
  -- km_end deve ser >= km_start
  CHECK (km_end >= km_start)
);

-- ─── 4. REGISTO DE ABASTECIMENTOS (opcional — detalhe extra) ──────────────
CREATE TABLE public.fleet_refuels (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     uuid REFERENCES public.fleet_submissions(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.fleet_profiles(id),
  vehicle_id        uuid NOT NULL REFERENCES public.fleet_vehicles(id),
  refuel_date       date NOT NULL,
  liters            numeric(8,2) NOT NULL,
  price_per_liter   numeric(6,4),
  total_cost        numeric(8,2),
  station           text,
  km_at_refuel      integer,
  receipt_url       text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── 5. ALERTAS / LEMBRETES (controlo de quem submeteu) ──────────────────
CREATE TABLE public.fleet_monthly_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_month   date NOT NULL,
  user_id           uuid NOT NULL REFERENCES public.fleet_profiles(id),
  reminded_at       timestamptz,
  submitted_at      timestamptz,    -- preenchido quando submete
  UNIQUE (user_id, reference_month)
);

-- ══════════════════════════════════════════════════════════════════════════
-- ÍNDICES
-- ══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_fleet_sub_user      ON public.fleet_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_fleet_sub_vehicle   ON public.fleet_submissions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fleet_sub_month     ON public.fleet_submissions(reference_month DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_refuel_sub    ON public.fleet_refuels(submission_id);
CREATE INDEX IF NOT EXISTS idx_fleet_veh_assigned  ON public.fleet_vehicles(assigned_to);

-- ══════════════════════════════════════════════════════════════════════════
-- TRIGGER — calcular co2_kg, avg_consumption e cost_per_km automaticamente
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fleet_calc_submission()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_co2_factor numeric(6,4);
BEGIN
  -- buscar factor CO₂ da viatura
  SELECT co2_factor INTO v_co2_factor
  FROM public.fleet_vehicles WHERE id = NEW.vehicle_id;

  -- CO₂ em kg
  IF NEW.liters IS NOT NULL AND NEW.liters > 0 THEN
    NEW.co2_kg := ROUND(NEW.liters * COALESCE(v_co2_factor, 2.64), 2);
  END IF;

  -- consumo médio L/100km
  IF NEW.liters IS NOT NULL AND (NEW.km_end - NEW.km_start) > 0 THEN
    NEW.avg_consumption := ROUND(NEW.liters / (NEW.km_end - NEW.km_start) * 100, 2);
  END IF;

  -- custo por km
  IF NEW.cost_eur IS NOT NULL AND (NEW.km_end - NEW.km_start) > 0 THEN
    NEW.cost_per_km := ROUND(NEW.cost_eur / (NEW.km_end - NEW.km_start), 4);
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fleet_calc_submission
  BEFORE INSERT OR UPDATE ON public.fleet_submissions
  FOR EACH ROW EXECUTE FUNCTION public.fleet_calc_submission();

-- updated_at automático em profiles e vehicles
CREATE OR REPLACE FUNCTION public.fleet_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_fleet_profiles_updated_at
  BEFORE UPDATE ON public.fleet_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fleet_set_updated_at();

CREATE TRIGGER trg_fleet_vehicles_updated_at
  BEFORE UPDATE ON public.fleet_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.fleet_set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- VIEWS ÚTEIS
-- ══════════════════════════════════════════════════════════════════════════

-- Vista: resumo mensal por utilizador (para dashboard manager)
CREATE OR REPLACE VIEW public.vw_fleet_monthly_summary
WITH (security_invoker = true) AS
SELECT
  fs.reference_month,
  fp.id           AS user_id,
  fp.full_name,
  fp.department,
  fv.plate,
  fv.brand,
  fv.model,
  fv.fuel_type,
  fs.km_total,
  fs.liters,
  fs.cost_eur,
  fs.co2_kg,
  fs.avg_consumption,
  fs.cost_per_km,
  fs.status,
  fs.created_at   AS submitted_at
FROM public.fleet_profiles fp
LEFT JOIN public.fleet_vehicles fv ON fv.assigned_to = fp.id AND fv.is_active = true
LEFT JOIN public.fleet_submissions fs
  ON fs.user_id = fp.id AND fs.vehicle_id = fv.id
WHERE fp.is_active = true;

-- Vista: KPIs globais por mês
CREATE OR REPLACE VIEW public.vw_fleet_kpis_by_month
WITH (security_invoker = true) AS
SELECT
  reference_month,
  COUNT(*)                          AS total_submissions,
  SUM(km_total)                     AS total_km,
  SUM(liters)                       AS total_liters,
  SUM(cost_eur)                     AS total_cost_eur,
  SUM(co2_kg)                       AS total_co2_kg,
  ROUND(AVG(avg_consumption), 2)    AS avg_consumption_l100km,
  ROUND(AVG(cost_per_km), 4)        AS avg_cost_per_km
FROM public.fleet_submissions
WHERE status != 'rejected'
GROUP BY reference_month
ORDER BY reference_month DESC;

-- Vista: estado do mês actual (quem submeteu / quem falta)
CREATE OR REPLACE VIEW public.vw_fleet_current_month_status
WITH (security_invoker = true) AS
SELECT
  fp.id           AS user_id,
  fp.full_name,
  fp.department,
  fv.plate,
  fv.brand || ' ' || fv.model AS vehicle_name,
  CASE WHEN fs.id IS NOT NULL THEN true ELSE false END AS submitted,
  fs.km_total,
  fs.liters,
  fs.cost_eur,
  fs.co2_kg,
  fs.status,
  fs.created_at AS submitted_at
FROM public.fleet_profiles fp
LEFT JOIN public.fleet_vehicles fv ON fv.assigned_to = fp.id AND fv.is_active = true
LEFT JOIN public.fleet_submissions fs
  ON fs.user_id = fp.id
  AND fs.vehicle_id = fv.id
  AND fs.reference_month = date_trunc('month', now())::date
WHERE fp.is_active = true AND fp.role = 'worker';

-- ══════════════════════════════════════════════════════════════════════════
-- RLS — Row Level Security
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.fleet_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_submissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_refuels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_monthly_alerts  ENABLE ROW LEVEL SECURITY;

-- helper: é manager ou admin?
CREATE OR REPLACE FUNCTION public.fleet_is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fleet_profiles
    WHERE id = auth.uid() AND role IN ('manager','admin') AND is_active = true
  );
$$;

-- PROFILES
CREATE POLICY fleet_profiles_select ON public.fleet_profiles FOR SELECT
  USING (id = auth.uid() OR fleet_is_manager());

CREATE POLICY fleet_profiles_update ON public.fleet_profiles FOR UPDATE
  USING (id = auth.uid() OR fleet_is_manager());

CREATE POLICY fleet_profiles_insert ON public.fleet_profiles FOR INSERT
  WITH CHECK (fleet_is_manager() OR id = auth.uid());

CREATE POLICY fleet_profiles_delete ON public.fleet_profiles FOR DELETE
  USING (fleet_is_manager());

-- VEHICLES — workers vêem só a sua, managers vêem todas
CREATE POLICY fleet_vehicles_select ON public.fleet_vehicles FOR SELECT
  USING (assigned_to = auth.uid() OR fleet_is_manager());

CREATE POLICY fleet_vehicles_all_manager ON public.fleet_vehicles FOR ALL
  USING (fleet_is_manager());

-- SUBMISSIONS — workers vêem só as suas, managers vêem todas
CREATE POLICY fleet_sub_select ON public.fleet_submissions FOR SELECT
  USING (user_id = auth.uid() OR fleet_is_manager());

CREATE POLICY fleet_sub_insert ON public.fleet_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY fleet_sub_update ON public.fleet_submissions FOR UPDATE
  USING (
    -- worker pode editar só os seus, até 30 dias após submissão
    (user_id = auth.uid() AND created_at > now() - interval '30 days')
    OR fleet_is_manager()
  );

CREATE POLICY fleet_sub_delete ON public.fleet_submissions FOR DELETE
  USING (fleet_is_manager());

-- REFUELS
CREATE POLICY fleet_refuel_select ON public.fleet_refuels FOR SELECT
  USING (user_id = auth.uid() OR fleet_is_manager());

CREATE POLICY fleet_refuel_insert ON public.fleet_refuels FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY fleet_refuel_update ON public.fleet_refuels FOR UPDATE
  USING (user_id = auth.uid() OR fleet_is_manager());

CREATE POLICY fleet_refuel_delete ON public.fleet_refuels FOR DELETE
  USING (fleet_is_manager());

-- ALERTS — só managers
CREATE POLICY fleet_alerts_all ON public.fleet_monthly_alerts FOR ALL
  USING (fleet_is_manager());

-- Revogar funções trigger de PUBLIC
REVOKE EXECUTE ON FUNCTION public.fleet_calc_submission() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fleet_set_updated_at()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fleet_is_manager()      FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fleet_is_manager()      TO authenticated;
