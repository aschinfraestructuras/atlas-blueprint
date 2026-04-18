ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS map_center_lat numeric,
  ADD COLUMN IF NOT EXISTS map_center_lng numeric,
  ADD COLUMN IF NOT EXISTS map_default_zoom smallint;