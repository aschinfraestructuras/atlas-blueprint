
-- PART 1: PPI discipline-aware codes
CREATE OR REPLACE FUNCTION public.fn_next_ppi_code(
  p_project_id uuid,
  p_disciplina text DEFAULT NULL
)
RETURNS text LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_seq    int;
BEGIN
  v_prefix := CASE p_disciplina
    WHEN 'terras'      THEN 'T'
    WHEN 'drenagem'    THEN 'DR'
    WHEN 'ferrovia'    THEN 'VF'
    WHEN 'estruturas'  THEN 'EST'
    WHEN 'instalacoes' THEN 'CAT'
    WHEN 'betao'       THEN 'BET'
    WHEN 'firmes'      THEN 'FIR'
    ELSE 'OT'
  END;

  SELECT coalesce(max(
    cast(nullif(regexp_replace(pi.code, '[^0-9]', '', 'g'), '') as int)
  ), 0) + 1
  INTO v_seq
  FROM public.ppi_instances pi
  WHERE pi.project_id = p_project_id
    AND pi.code LIKE 'PPI-' || v_prefix || '-%';

  RETURN 'PPI-' || v_prefix || '-' || lpad(v_seq::text, 3, '0');
END; $$;

-- PART 3: Field Records (GR)
CREATE TABLE public.field_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code            text NOT NULL,
  ppi_instance_id uuid REFERENCES public.ppi_instances(id) ON DELETE SET NULL,
  point_type      text NOT NULL DEFAULT 'rp',
  activity        text NOT NULL,
  location_pk     text,
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  weather         text DEFAULT 'bom',
  inspector_id    uuid REFERENCES auth.users(id),
  specialist_name text,
  result          text NOT NULL DEFAULT 'conforme',
  has_photos      boolean NOT NULL DEFAULT false,
  observations    text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.field_record_materials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id       uuid NOT NULL REFERENCES public.field_records(id) ON DELETE CASCADE,
  material_name   text NOT NULL,
  fav_pame_ref    text,
  lot_ref         text,
  quantity        text
);

CREATE TABLE public.field_record_checks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id       uuid NOT NULL REFERENCES public.field_records(id) ON DELETE CASCADE,
  item_no         int NOT NULL,
  description     text NOT NULL,
  criteria        text,
  method          text,
  result          text DEFAULT 'ok',
  measured_value  text
);

-- Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.fn_validate_field_record()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.point_type NOT IN ('rp','wp') THEN
    RAISE EXCEPTION 'Invalid point_type: %', NEW.point_type;
  END IF;
  IF NEW.weather IS NOT NULL AND NEW.weather NOT IN ('bom','nublado','chuva','chuva_forte','vento') THEN
    RAISE EXCEPTION 'Invalid weather: %', NEW.weather;
  END IF;
  IF NEW.result NOT IN ('conforme','conforme_obs','nao_conforme','pendente') THEN
    RAISE EXCEPTION 'Invalid result: %', NEW.result;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_field_record
  BEFORE INSERT OR UPDATE ON public.field_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_field_record();

CREATE OR REPLACE FUNCTION public.fn_validate_field_record_check()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.result IS NOT NULL AND NEW.result NOT IN ('ok','nc','na') THEN
    RAISE EXCEPTION 'Invalid check result: %', NEW.result;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_field_record_check
  BEFORE INSERT OR UPDATE ON public.field_record_checks
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_field_record_check();

ALTER TABLE public.field_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_record_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_record_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members access field_records"
  ON public.field_records FOR ALL
  USING (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid() AND pm.is_active = true));
CREATE POLICY "project members access field_record_materials"
  ON public.field_record_materials FOR ALL
  USING (record_id IN (SELECT fr.id FROM public.field_records fr WHERE fr.project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid() AND pm.is_active = true)));
CREATE POLICY "project members access field_record_checks"
  ON public.field_record_checks FOR ALL
  USING (record_id IN (SELECT fr.id FROM public.field_records fr WHERE fr.project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid() AND pm.is_active = true)));

CREATE INDEX idx_field_records_project ON public.field_records(project_id);
CREATE INDEX idx_field_records_ppi ON public.field_records(ppi_instance_id);

CREATE OR REPLACE FUNCTION public.fn_next_gr_code(p_project_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seq int;
BEGIN
  SELECT coalesce(max(cast(nullif(regexp_replace(fr.code,'[^0-9]','','g'),'') as int)),0)+1
  INTO v_seq FROM public.field_records fr WHERE fr.project_id = p_project_id;
  RETURN 'GR-PF17A-' || lpad(v_seq::text, 3, '0');
END; $$;

-- PART 4: BE-CAMPO columns on test_results
ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS gr_id uuid REFERENCES public.field_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS be_campo_code text,
  ADD COLUMN IF NOT EXISTS eme_code text,
  ADD COLUMN IF NOT EXISTS eme_calibration_date date,
  ADD COLUMN IF NOT EXISTS location_pk text,
  ADD COLUMN IF NOT EXISTS weather text,
  ADD COLUMN IF NOT EXISTS ambient_temperature numeric;

CREATE OR REPLACE FUNCTION public.fn_next_be_campo_code(
  p_project_id uuid,
  p_test_type text DEFAULT NULL
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefix text;
  v_seq    int;
BEGIN
  v_prefix := CASE p_test_type
    WHEN 'compaction_nuclear'  THEN 'BE-COMP'
    WHEN 'compaction_plate'    THEN 'BE-PLQ'
    WHEN 'slump'               THEN 'BE-SLUMP'
    WHEN 'temperature'         THEN 'BE-TEMP'
    WHEN 'insulation'          THEN 'BE-ISO'
    WHEN 'earth_resistance'    THEN 'BE-TERRA'
    WHEN 'otdr'                THEN 'BE-OTDR'
    ELSE 'BE-CAMPO'
  END;
  SELECT coalesce(max(cast(nullif(regexp_replace(tr.be_campo_code,'[^0-9]','','g'),'') as int)),0)+1
  INTO v_seq FROM public.test_results tr
  WHERE tr.project_id = p_project_id
    AND tr.be_campo_code LIKE v_prefix || '-%';
  RETURN v_prefix || '-PF17A-' || lpad(v_seq::text, 3, '0');
END; $$;
