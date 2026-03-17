
-- Welding records table for aluminothermic rail welding control (EN 14730)
CREATE TABLE public.weld_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code                text NOT NULL,
  work_item_id        uuid REFERENCES public.work_items(id) ON DELETE SET NULL,
  ppi_instance_id     uuid REFERENCES public.ppi_instances(id) ON DELETE SET NULL,
  weld_date           date NOT NULL DEFAULT CURRENT_DATE,
  pk_location         text NOT NULL,
  rail_profile        text NOT NULL DEFAULT '60E1'
                      CHECK (rail_profile IN ('60E1','54E1','55G2','46E3','50E6')),
  track_side          text DEFAULT 'esquerda'
                      CHECK (track_side IN ('esquerda','direita','ambos')),
  weld_type           text NOT NULL DEFAULT 'aluminotermica'
                      CHECK (weld_type IN ('aluminotermica','continua','flash_butt')),
  operator_name       text,
  operator_cert_ref   text,
  portion_brand       text,
  portion_lot         text,
  mold_type           text,
  preheat_temp_c      numeric,
  preheat_duration_min numeric,
  preheat_pass        boolean,
  visual_pass         boolean,
  visual_notes        text,
  excess_material_ok  boolean,
  alignment_mm        numeric,
  alignment_criteria  numeric DEFAULT 0.5,
  alignment_pass      boolean,
  has_ut              boolean DEFAULT false,
  ut_operator         text,
  ut_equipment_code   text,
  ut_calibration_date date,
  ut_result           text CHECK (ut_result IS NULL OR ut_result IN ('aceite','rejeitado','pendente')),
  ut_defect_desc      text,
  has_hardness        boolean DEFAULT false,
  hv_rail_left        numeric,
  hv_rail_right       numeric,
  hv_weld_center      numeric,
  hv_criteria_min     numeric DEFAULT 260,
  hv_criteria_max     numeric DEFAULT 380,
  hv_pass             boolean,
  overall_result      text NOT NULL DEFAULT 'pending'
                      CHECK (overall_result IN ('pass','fail','pending','repair_needed')),
  rejection_reason    text,
  notes               text,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weld_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members access weld_records"
  ON public.weld_records FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE INDEX idx_weld_records_project ON public.weld_records(project_id);
CREATE INDEX idx_weld_records_work_item ON public.weld_records(work_item_id);
CREATE INDEX idx_weld_records_ppi ON public.weld_records(ppi_instance_id);

CREATE OR REPLACE FUNCTION public.fn_next_weld_code(p_project_id uuid)
RETURNS text LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_seq int;
BEGIN
  SELECT coalesce(max(cast(regexp_replace(code,'[^0-9]','','g') as int)),0)+1
  INTO v_seq FROM public.weld_records WHERE project_id = p_project_id;
  RETURN 'SOLD-PF17A-' || lpad(v_seq::text, 3, '0');
END; $$;
