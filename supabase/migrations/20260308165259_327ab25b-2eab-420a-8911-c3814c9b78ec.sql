
-- Recycled materials main table
CREATE TABLE IF NOT EXISTS public.recycled_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('FAM','PAP','BAM','OUTRO')),
  material_name TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  composition TEXT,
  recycled_content_pct NUMERIC CHECK (recycled_content_pct BETWEEN 0 AND 100),
  serial_number TEXT,
  quantity_planned NUMERIC,
  quantity_used NUMERIC,
  unit TEXT DEFAULT 't',
  application_location TEXT,
  application_date DATE,
  certificate_number TEXT,
  document_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
  observations TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recycled_material_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recycled_material_id UUID NOT NULL REFERENCES recycled_materials(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID
);

ALTER TABLE recycled_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycled_material_documents ENABLE ROW LEVEL SECURITY;

-- RLS for recycled_materials
CREATE POLICY "rm_select" ON recycled_materials FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "rm_insert" ON recycled_materials FOR INSERT TO authenticated
  WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "rm_update" ON recycled_materials FOR UPDATE TO authenticated
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "rm_delete" ON recycled_materials FOR DELETE TO authenticated
  USING (is_project_admin(auth.uid(), project_id));

-- RLS for recycled_material_documents
CREATE POLICY "rmd_select" ON recycled_material_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM recycled_materials rm WHERE rm.id = recycled_material_documents.recycled_material_id AND is_project_member(auth.uid(), rm.project_id)));
CREATE POLICY "rmd_insert" ON recycled_material_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM recycled_materials rm WHERE rm.id = recycled_material_documents.recycled_material_id AND is_project_member(auth.uid(), rm.project_id)));
CREATE POLICY "rmd_update" ON recycled_material_documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM recycled_materials rm WHERE rm.id = recycled_material_documents.recycled_material_id AND is_project_member(auth.uid(), rm.project_id)));
CREATE POLICY "rmd_delete" ON recycled_material_documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM recycled_materials rm WHERE rm.id = recycled_material_documents.recycled_material_id AND is_project_admin(auth.uid(), rm.project_id)));
