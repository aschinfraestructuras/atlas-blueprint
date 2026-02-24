
-- =============================================
-- MODULE: Materials (Enterprise)
-- =============================================

-- 1. Materials catalog table
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  specification text,
  unit text,
  normative_refs text,
  acceptance_criteria text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT materials_status_chk CHECK (status IN ('active','discontinued','archived')),
  CONSTRAINT materials_project_code_uq UNIQUE (project_id, code)
);

CREATE INDEX idx_materials_project ON public.materials(project_id);
CREATE INDEX idx_materials_project_category ON public.materials(project_id, category);
CREATE INDEX idx_materials_project_status ON public.materials(project_id, status);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mat_select" ON public.materials FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "mat_insert" ON public.materials FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "mat_update" ON public.materials FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "mat_delete" ON public.materials FOR DELETE USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER set_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Material documents junction
CREATE TABLE public.material_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id),
  doc_type text NOT NULL DEFAULT 'other',
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_matdoc_proj_mat ON public.material_documents(project_id, material_id);
CREATE INDEX idx_matdoc_proj_doctype ON public.material_documents(project_id, doc_type);
CREATE INDEX idx_matdoc_proj_validto ON public.material_documents(project_id, valid_to);

ALTER TABLE public.material_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matdoc_select" ON public.material_documents FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "matdoc_insert" ON public.material_documents FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "matdoc_update" ON public.material_documents FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "matdoc_delete" ON public.material_documents FOR DELETE USING (is_project_admin(auth.uid(), project_id));

-- 3. Work item materials junction
CREATE TABLE public.work_item_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  work_item_id uuid NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  lot_ref text,
  quantity numeric,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wim_unique UNIQUE (project_id, work_item_id, material_id)
);

CREATE INDEX idx_wim_project ON public.work_item_materials(project_id);
CREATE INDEX idx_wim_material ON public.work_item_materials(material_id);

ALTER TABLE public.work_item_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wim_select" ON public.work_item_materials FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "wim_insert" ON public.work_item_materials FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "wim_update" ON public.work_item_materials FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "wim_delete" ON public.work_item_materials FOR DELETE USING (is_project_admin(auth.uid(), project_id));

-- 4. Add material_id FK to supplier_materials
ALTER TABLE public.supplier_materials ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id);
CREATE INDEX IF NOT EXISTS idx_supmat_material ON public.supplier_materials(material_id);

-- 5. Add material_id FK to test_results
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id);
CREATE INDEX IF NOT EXISTS idx_tr_proj_material ON public.test_results(project_id, material_id);

-- 6. Add material_id FK to non_conformities
ALTER TABLE public.non_conformities ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id);
CREATE INDEX IF NOT EXISTS idx_nc_proj_material ON public.non_conformities(project_id, material_id);

-- 7. Auto-code RPC
CREATE OR REPLACE FUNCTION public.fn_create_material(
  p_project_id uuid,
  p_name text,
  p_category text,
  p_subcategory text DEFAULT NULL,
  p_specification text DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_normative_refs text DEFAULT NULL,
  p_acceptance_criteria text DEFAULT NULL
) RETURNS public.materials
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_proj_code text;
  v_seq int;
  v_code text;
  v_result public.materials;
BEGIN
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT code INTO v_proj_code FROM public.projects WHERE id = p_project_id;
  SELECT COALESCE(MAX(
    CASE WHEN m.code ~ ('^MAT-' || v_proj_code || '-[0-9]{4,}$')
    THEN substring(m.code FROM length('MAT-' || v_proj_code || '-') + 1)::int
    ELSE 0 END
  ), 0) + 1 INTO v_seq FROM public.materials m WHERE m.project_id = p_project_id;
  v_code := 'MAT-' || v_proj_code || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.materials (project_id, code, name, category, subcategory, specification, unit, normative_refs, acceptance_criteria, created_by)
  VALUES (p_project_id, v_code, p_name, p_category, p_subcategory, p_specification, p_unit, p_normative_refs, p_acceptance_criteria, auth.uid())
  RETURNING * INTO v_result;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, auth.uid(), 'materials', v_result.id, 'INSERT', 'materials',
    jsonb_build_object('code', v_code, 'name', p_name, 'category', p_category));
  RETURN v_result;
END;
$$;

-- 8. KPI view: materials summary per project
CREATE OR REPLACE VIEW public.view_materials_kpi AS
SELECT
  m.project_id,
  COUNT(*) AS materials_total,
  COUNT(*) FILTER (WHERE m.status = 'active') AS materials_active,
  COUNT(*) FILTER (WHERE m.status = 'discontinued') AS materials_discontinued,
  COUNT(DISTINCT CASE WHEN md_exp.material_id IS NOT NULL THEN m.id END) AS materials_with_expired_docs,
  COUNT(DISTINCT CASE WHEN nc_open.material_id IS NOT NULL THEN m.id END) AS materials_with_open_nc,
  COUNT(DISTINCT CASE WHEN tr_fail.material_id IS NOT NULL THEN m.id END) AS materials_with_nonconform_tests_30d
FROM public.materials m
LEFT JOIN LATERAL (
  SELECT md.material_id FROM public.material_documents md
  WHERE md.material_id = m.id AND md.valid_to IS NOT NULL AND md.valid_to < CURRENT_DATE LIMIT 1
) md_exp ON true
LEFT JOIN LATERAL (
  SELECT nc.material_id FROM public.non_conformities nc
  WHERE nc.material_id = m.id AND nc.status NOT IN ('closed','archived') LIMIT 1
) nc_open ON true
LEFT JOIN LATERAL (
  SELECT tr.material_id FROM public.test_results tr
  WHERE tr.material_id = m.id AND tr.pass_fail = 'fail' AND tr.date >= CURRENT_DATE - 30 LIMIT 1
) tr_fail ON true
GROUP BY m.project_id;

-- 9. Detail metrics view per material
CREATE OR REPLACE VIEW public.view_material_detail_metrics AS
SELECT
  m.id AS material_id,
  m.project_id,
  (SELECT COUNT(*) FROM public.supplier_materials sm WHERE sm.material_id = m.id) AS suppliers_count,
  (SELECT COUNT(*) FROM public.material_documents md WHERE md.material_id = m.id AND md.valid_to IS NOT NULL AND md.valid_to < CURRENT_DATE) AS docs_expired,
  (SELECT COUNT(*) FROM public.material_documents md WHERE md.material_id = m.id AND md.valid_to IS NOT NULL AND md.valid_to BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS docs_expiring_30d,
  (SELECT COUNT(*) FROM public.test_results tr WHERE tr.material_id = m.id) AS tests_total,
  (SELECT COUNT(*) FROM public.test_results tr WHERE tr.material_id = m.id AND tr.pass_fail = 'fail') AS tests_nonconform,
  (SELECT COUNT(*) FROM public.non_conformities nc WHERE nc.material_id = m.id AND nc.status NOT IN ('closed','archived')) AS nc_open_count,
  (SELECT COUNT(*) FROM public.work_item_materials wim WHERE wim.material_id = m.id) AS work_items_count
FROM public.materials m;
