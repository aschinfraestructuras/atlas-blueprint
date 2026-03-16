
-- ═══════════════════════════════════════════════════════════════
-- PROMPT A: Concrete Batches (Fichas de Betonagem)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.concrete_batches (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code              text NOT NULL,
  work_item_id      uuid REFERENCES public.work_items(id) ON DELETE SET NULL,
  ppi_instance_id   uuid REFERENCES public.ppi_instances(id) ON DELETE SET NULL,
  element_betonado  text NOT NULL,
  pk_location       text,
  batch_date        date NOT NULL DEFAULT CURRENT_DATE,
  batch_time        time,
  supplier_id       uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  delivery_note_ref text,
  truck_plate       text,
  concrete_class    text NOT NULL DEFAULT 'C25/30',
  cement_type       text,
  max_aggregate     int,
  consistency_class text DEFAULT 'S3',
  slump_mm          numeric,
  slump_pass        boolean,
  temp_concrete     numeric,
  temp_ambient      numeric,
  temp_pass         boolean,
  air_content       numeric,
  status            text NOT NULL DEFAULT 'open',
  lab_name          text,
  technician_name   text,
  notes             text,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.fn_validate_concrete_batch_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','specimens_sent','results_received','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid concrete_batch status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_concrete_batch_status
  BEFORE INSERT OR UPDATE ON public.concrete_batches
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_concrete_batch_status();

CREATE TABLE public.concrete_specimens (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         uuid NOT NULL REFERENCES public.concrete_batches(id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  specimen_no      int NOT NULL,
  mold_date        date NOT NULL,
  cure_days        int NOT NULL DEFAULT 28,
  test_date        date,
  lab_ref          text,
  dimension_mm     int DEFAULT 150,
  shape            text DEFAULT 'cube',
  break_load_kn    numeric,
  strength_mpa     numeric GENERATED ALWAYS AS (
                     CASE
                       WHEN shape = 'cube' AND dimension_mm = 150 AND break_load_kn IS NOT NULL
                         THEN round((break_load_kn * 1000.0 / (150.0 * 150.0))::numeric, 2)
                       WHEN shape = 'cube' AND dimension_mm = 100 AND break_load_kn IS NOT NULL
                         THEN round((break_load_kn * 1000.0 / (100.0 * 100.0))::numeric, 2)
                       ELSE NULL
                     END
                   ) STORED,
  pass_fail        text DEFAULT 'pending',
  fracture_type    text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Validation triggers for specimens
CREATE OR REPLACE FUNCTION public.fn_validate_concrete_specimen()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.shape IS NOT NULL AND NEW.shape NOT IN ('cube','cylinder') THEN
    RAISE EXCEPTION 'Invalid specimen shape: %', NEW.shape;
  END IF;
  IF NEW.pass_fail IS NOT NULL AND NEW.pass_fail NOT IN ('pass','fail','pending') THEN
    RAISE EXCEPTION 'Invalid specimen pass_fail: %', NEW.pass_fail;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_concrete_specimen
  BEFORE INSERT OR UPDATE ON public.concrete_specimens
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_concrete_specimen();

-- RLS
ALTER TABLE public.concrete_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concrete_specimens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members access concrete_batches"
  ON public.concrete_batches FOR ALL
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "project members access concrete_specimens"
  ON public.concrete_specimens FOR ALL
  USING (public.is_project_member(auth.uid(), project_id));

CREATE INDEX idx_concrete_batches_project ON public.concrete_batches(project_id);
CREATE INDEX idx_concrete_batches_work_item ON public.concrete_batches(work_item_id);
CREATE INDEX idx_concrete_batches_ppi ON public.concrete_batches(ppi_instance_id);
CREATE INDEX idx_concrete_specimens_batch ON public.concrete_specimens(batch_id);

CREATE OR REPLACE FUNCTION public.fn_next_concrete_batch_code(p_project_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_seq int;
BEGIN
  SELECT coalesce(max(cast(nullif(regexp_replace(code,'[^0-9]','','g'),'') as int)),0)+1
  INTO v_seq FROM public.concrete_batches WHERE project_id = p_project_id;
  RETURN 'BE-BET-PF17A-' || lpad(v_seq::text, 3, '0');
END; $$;

-- ═══════════════════════════════════════════════════════════════
-- PROMPT B: Compaction Zones
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.compaction_zones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code                text NOT NULL,
  work_item_id        uuid REFERENCES public.work_items(id) ON DELETE SET NULL,
  ppi_instance_id     uuid REFERENCES public.ppi_instances(id) ON DELETE SET NULL,
  zone_description    text NOT NULL,
  pk_start            text,
  pk_end              text,
  layer_no            int,
  material_type       text,
  material_ref        text,
  test_date           date NOT NULL DEFAULT CURRENT_DATE,
  proctor_gamma_max   numeric,
  proctor_wopt        numeric,
  compaction_criteria numeric DEFAULT 95.0,
  ev2_criteria        numeric DEFAULT 80.0,
  ev2_ev1_criteria    numeric DEFAULT 2.2,
  overall_result      text DEFAULT 'pending',
  technician_name     text,
  notes               text,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_validate_compaction_zone()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.overall_result IS NOT NULL AND NEW.overall_result NOT IN ('pass','fail','pending') THEN
    RAISE EXCEPTION 'Invalid compaction zone result: %', NEW.overall_result;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_compaction_zone
  BEFORE INSERT OR UPDATE ON public.compaction_zones
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_compaction_zone();

CREATE TABLE public.compaction_nuclear_points (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id           uuid NOT NULL REFERENCES public.compaction_zones(id) ON DELETE CASCADE,
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  point_no          int NOT NULL,
  pk_point          text,
  depth_cm          numeric,
  gamma_dry_measured numeric NOT NULL,
  water_content     numeric,
  compaction_degree  numeric,
  eme_code          text,
  eme_calibration_date date,
  pass_fail         text DEFAULT 'pending',
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_validate_nuclear_point()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pass_fail IS NOT NULL AND NEW.pass_fail NOT IN ('pass','fail','pending') THEN
    RAISE EXCEPTION 'Invalid nuclear point pass_fail: %', NEW.pass_fail;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_nuclear_point
  BEFORE INSERT OR UPDATE ON public.compaction_nuclear_points
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_nuclear_point();

CREATE TABLE public.compaction_plate_tests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id     uuid NOT NULL REFERENCES public.compaction_zones(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  point_no    int NOT NULL,
  pk_point    text,
  ev1_mpa     numeric,
  ev2_mpa     numeric,
  ev2_ev1_ratio numeric GENERATED ALWAYS AS (
                  CASE WHEN ev1_mpa > 0 AND ev2_mpa IS NOT NULL
                    THEN round((ev2_mpa / ev1_mpa)::numeric, 2)
                  ELSE NULL END
                ) STORED,
  pass_fail   text DEFAULT 'pending',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_validate_plate_test()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pass_fail IS NOT NULL AND NEW.pass_fail NOT IN ('pass','fail','pending') THEN
    RAISE EXCEPTION 'Invalid plate test pass_fail: %', NEW.pass_fail;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_plate_test
  BEFORE INSERT OR UPDATE ON public.compaction_plate_tests
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_plate_test();

ALTER TABLE public.compaction_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compaction_nuclear_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compaction_plate_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members access compaction_zones"
  ON public.compaction_zones FOR ALL
  USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "project members access compaction_nuclear_points"
  ON public.compaction_nuclear_points FOR ALL
  USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "project members access compaction_plate_tests"
  ON public.compaction_plate_tests FOR ALL
  USING (public.is_project_member(auth.uid(), project_id));

CREATE INDEX idx_comp_zones_project ON public.compaction_zones(project_id);
CREATE INDEX idx_comp_zones_work_item ON public.compaction_zones(work_item_id);
CREATE INDEX idx_comp_zones_ppi ON public.compaction_zones(ppi_instance_id);
CREATE INDEX idx_comp_nuclear_zone ON public.compaction_nuclear_points(zone_id);
CREATE INDEX idx_comp_plate_zone ON public.compaction_plate_tests(zone_id);

CREATE OR REPLACE FUNCTION public.fn_next_compaction_code(p_project_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_seq int;
BEGIN
  SELECT coalesce(max(cast(nullif(regexp_replace(code,'[^0-9]','','g'),'') as int)),0)+1
  INTO v_seq FROM public.compaction_zones WHERE project_id = p_project_id;
  RETURN 'CMP-PF17A-' || lpad(v_seq::text, 3, '0');
END; $$;

-- ═══════════════════════════════════════════════════════════════
-- PROMPT C: Soil Samples (Caracterização de Solos)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.soil_samples (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code            text NOT NULL,
  work_item_id    uuid REFERENCES public.work_items(id) ON DELETE SET NULL,
  sample_ref      text NOT NULL,
  pk_location     text,
  depth_from      numeric,
  depth_to        numeric,
  sample_date     date NOT NULL DEFAULT CURRENT_DATE,
  supplier_id     uuid REFERENCES public.suppliers(id),
  material_type   text,
  has_grading     boolean DEFAULT false,
  grading_d10     numeric, grading_d30 numeric, grading_d60 numeric,
  grading_cu      numeric GENERATED ALWAYS AS (CASE WHEN grading_d10 > 0 THEN round((grading_d60/grading_d10)::numeric,2) ELSE NULL END) STORED,
  grading_cc      numeric GENERATED ALWAYS AS (CASE WHEN grading_d10 > 0 AND grading_d60 > 0 THEN round(((grading_d30*grading_d30)/(grading_d10*grading_d60))::numeric,2) ELSE NULL END) STORED,
  grading_p0075   numeric,
  grading_p0425   numeric,
  grading_p2      numeric,
  grading_p10     numeric,
  grading_p20     numeric,
  grading_p50     numeric,
  has_atterberg   boolean DEFAULT false,
  ll_pct          numeric,
  lp_pct          numeric,
  ip_pct          numeric GENERATED ALWAYS AS (CASE WHEN ll_pct IS NOT NULL AND lp_pct IS NOT NULL THEN round((ll_pct - lp_pct)::numeric,1) ELSE NULL END) STORED,
  aashto_class    text,
  has_proctor     boolean DEFAULT false,
  proctor_gamma_max numeric,
  proctor_wopt    numeric,
  proctor_points  jsonb DEFAULT '[]',
  has_cbr         boolean DEFAULT false,
  cbr_95          numeric,
  cbr_98          numeric,
  cbr_expansion   numeric,
  cbr_criteria    numeric,
  cbr_pass        boolean,
  has_organic     boolean DEFAULT false,
  organic_pct     numeric,
  organic_method  text DEFAULT 'EN 1744-1',
  organic_limit   numeric DEFAULT 2.0,
  organic_pass    boolean,
  has_sulfates    boolean DEFAULT false,
  sulfate_pct     numeric,
  chloride_pct    numeric,
  sulfate_limit   numeric DEFAULT 0.5,
  sulfate_pass    boolean,
  overall_result  text DEFAULT 'pending',
  extra_tests     jsonb DEFAULT '[]',
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_validate_soil_sample()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.overall_result IS NOT NULL AND NEW.overall_result NOT IN ('apto','conditional','inapto','pending') THEN
    RAISE EXCEPTION 'Invalid soil sample result: %', NEW.overall_result;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_soil_sample
  BEFORE INSERT OR UPDATE ON public.soil_samples
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_soil_sample();

ALTER TABLE public.soil_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project members access soil_samples"
  ON public.soil_samples FOR ALL
  USING (public.is_project_member(auth.uid(), project_id));

CREATE INDEX idx_soil_samples_project ON public.soil_samples(project_id);
CREATE INDEX idx_soil_samples_work_item ON public.soil_samples(work_item_id);

CREATE OR REPLACE FUNCTION public.fn_next_soil_code(p_project_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_seq int;
BEGIN
  SELECT coalesce(max(cast(nullif(regexp_replace(code,'[^0-9]','','g'),'') as int)),0)+1
  INTO v_seq FROM public.soil_samples WHERE project_id = p_project_id;
  RETURN 'SOLO-PF17A-' || lpad(v_seq::text, 3, '0');
END; $$;

-- ═══════════════════════════════════════════════════════════════
-- PROMPT D: Add ppi_instance_id to test_results
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS ppi_instance_id uuid
    REFERENCES public.ppi_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_test_results_ppi
  ON public.test_results(ppi_instance_id) WHERE ppi_instance_id IS NOT NULL;
