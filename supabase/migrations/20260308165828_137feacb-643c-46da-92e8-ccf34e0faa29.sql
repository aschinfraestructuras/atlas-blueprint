
ALTER TABLE daily_report_materials 
  ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materials(id),
  ADD COLUMN IF NOT EXISTS pame_reference TEXT;
