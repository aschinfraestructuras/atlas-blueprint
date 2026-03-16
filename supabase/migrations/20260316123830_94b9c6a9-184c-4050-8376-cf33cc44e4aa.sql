ALTER TABLE public.daily_report_materials
  ADD COLUMN IF NOT EXISTS preliminary_storage text,
  ADD COLUMN IF NOT EXISTS final_destination text;