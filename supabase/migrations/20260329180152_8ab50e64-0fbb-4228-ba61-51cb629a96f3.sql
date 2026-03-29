-- Topography FT Points (Ficha Topográfica)
CREATE TABLE IF NOT EXISTS public.topography_ft_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.topography_controls(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  point_no integer NOT NULL,
  pk_element text,
  x_proj numeric,
  x_med numeric,
  y_proj numeric,
  y_med numeric,
  z_proj numeric,
  z_med numeric,
  delta_x numeric GENERATED ALWAYS AS (x_med - x_proj) STORED,
  delta_y numeric GENERATED ALWAYS AS (y_med - y_proj) STORED,
  delta_z numeric GENERATED ALWAYS AS (z_med - z_proj) STORED,
  ok_nc text DEFAULT 'ok' CHECK (ok_nc IN ('ok', 'nc')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.topography_ft_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view FT points"
  ON public.topography_ft_points FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert FT points"
  ON public.topography_ft_points FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update FT points"
  ON public.topography_ft_points FOR UPDATE TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can delete FT points"
  ON public.topography_ft_points FOR DELETE TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

-- Weld Records — FS enhancements
ALTER TABLE public.weld_records
  ADD COLUMN IF NOT EXISTS wps_ref text,
  ADD COLUMN IF NOT EXISTS mold_type text,
  ADD COLUMN IF NOT EXISTS preheat_equipment text,
  ADD COLUMN IF NOT EXISTS preheat_duration_min integer,
  ADD COLUMN IF NOT EXISTS preheat_temp_c integer,
  ADD COLUMN IF NOT EXISTS post_weld_checks jsonb DEFAULT '[]'::jsonb;

-- Weld Records — FUS enhancements
ALTER TABLE public.weld_records
  ADD COLUMN IF NOT EXISTS us_equipment_code text,
  ADD COLUMN IF NOT EXISTS us_equipment_serial text,
  ADD COLUMN IF NOT EXISTS us_frequency_mhz numeric,
  ADD COLUMN IF NOT EXISTS us_norm_class text,
  ADD COLUMN IF NOT EXISTS us_inspection_zones jsonb DEFAULT '[]'::jsonb;