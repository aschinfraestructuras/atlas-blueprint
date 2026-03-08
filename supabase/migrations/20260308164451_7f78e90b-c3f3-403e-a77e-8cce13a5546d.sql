
-- Main daily report table
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id),
  report_date DATE NOT NULL,
  report_number TEXT NOT NULL,
  weather TEXT,
  temperature_min NUMERIC,
  temperature_max NUMERIC,
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','validated')),
  signed_contractor BOOLEAN DEFAULT false,
  signed_supervisor BOOLEAN DEFAULT false,
  signed_ip BOOLEAN DEFAULT false,
  foreman_name TEXT,
  contractor_rep TEXT,
  supervisor_rep TEXT,
  ip_rep TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, report_date, report_number)
);

-- Section 3: Labour
CREATE TABLE IF NOT EXISTS public.daily_report_labour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT,
  time_start TIME,
  time_end TIME,
  hours_worked NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Section 4: Equipment
CREATE TABLE IF NOT EXISTS public.daily_report_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  type TEXT,
  serial_number TEXT,
  sound_power_db NUMERIC,
  hours_worked NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Section 5: Materials
CREATE TABLE IF NOT EXISTS public.daily_report_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  nomenclature TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  lot_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Section 6: RMM
CREATE TABLE IF NOT EXISTS public.daily_report_rmm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  internal_code TEXT,
  designation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Section 7: Waste/Surplus
CREATE TABLE IF NOT EXISTS public.daily_report_waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  packaging_type TEXT,
  quantity NUMERIC,
  unit TEXT,
  preliminary_storage TEXT,
  final_destination TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_report_labour ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_report_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_report_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_report_rmm ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_report_waste ENABLE ROW LEVEL SECURITY;

-- RLS: daily_reports
CREATE POLICY "dr_select" ON daily_reports FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "dr_insert" ON daily_reports FOR INSERT TO authenticated
  WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "dr_update" ON daily_reports FOR UPDATE TO authenticated
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "dr_delete" ON daily_reports FOR DELETE TO authenticated
  USING (is_project_admin(auth.uid(), project_id));

-- RLS: child tables via parent lookup
CREATE POLICY "drl_select" ON daily_report_labour FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_labour.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drl_insert" ON daily_report_labour FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_labour.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drl_update" ON daily_report_labour FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_labour.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drl_delete" ON daily_report_labour FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_labour.daily_report_id AND is_project_admin(auth.uid(), dr.project_id)));

CREATE POLICY "dre_select" ON daily_report_equipment FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_equipment.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "dre_insert" ON daily_report_equipment FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_equipment.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "dre_update" ON daily_report_equipment FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_equipment.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "dre_delete" ON daily_report_equipment FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_equipment.daily_report_id AND is_project_admin(auth.uid(), dr.project_id)));

CREATE POLICY "drm_select" ON daily_report_materials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_materials.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drm_insert" ON daily_report_materials FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_materials.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drm_update" ON daily_report_materials FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_materials.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drm_delete" ON daily_report_materials FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_materials.daily_report_id AND is_project_admin(auth.uid(), dr.project_id)));

CREATE POLICY "drr_select" ON daily_report_rmm FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_rmm.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drr_insert" ON daily_report_rmm FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_rmm.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drr_update" ON daily_report_rmm FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_rmm.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drr_delete" ON daily_report_rmm FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_rmm.daily_report_id AND is_project_admin(auth.uid(), dr.project_id)));

CREATE POLICY "drw_select" ON daily_report_waste FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_waste.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drw_insert" ON daily_report_waste FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_waste.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drw_update" ON daily_report_waste FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_waste.daily_report_id AND is_project_member(auth.uid(), dr.project_id)));
CREATE POLICY "drw_delete" ON daily_report_waste FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_reports dr WHERE dr.id = daily_report_waste.daily_report_id AND is_project_admin(auth.uid(), dr.project_id)));
