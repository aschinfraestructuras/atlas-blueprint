
-- ═══════════════════════════════════════════════════════════════════════
-- SUPPLIERS ENTERPRISE MIGRATION
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Extend suppliers table ──────────────────────────────────────────
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS qualification_score numeric,
  ADD COLUMN IF NOT EXISTS notes text;

-- Rename approval_status → qualification_status (keep old name as alias via view if needed)
-- Actually keep approval_status since it's used everywhere, just add qualification_status
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS qualification_status text DEFAULT 'pending';

-- Backfill qualification_status from approval_status
UPDATE public.suppliers SET qualification_status = approval_status WHERE qualification_status = 'pending' AND approval_status != 'pending';

-- ── Auto-generate codes for existing suppliers ─────────────────────────
DO $$
DECLARE
  r RECORD;
  v_proj_code text;
  v_seq int;
BEGIN
  FOR r IN
    SELECT s.id, s.project_id
    FROM public.suppliers s
    WHERE s.code IS NULL
    ORDER BY s.created_at
  LOOP
    SELECT p.code INTO v_proj_code FROM public.projects p WHERE p.id = r.project_id;
    SELECT COALESCE(MAX(
      CASE WHEN s2.code ~ ('^SUP-' || v_proj_code || '-[0-9]{4,}$')
      THEN substring(s2.code FROM length('SUP-' || v_proj_code || '-') + 1)::int
      ELSE 0 END
    ), 0) + 1 INTO v_seq
    FROM public.suppliers s2 WHERE s2.project_id = r.project_id AND s2.code IS NOT NULL;

    UPDATE public.suppliers SET code = 'SUP-' || v_proj_code || '-' || lpad(v_seq::text, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_project_code ON public.suppliers(project_id, code);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_project_status ON public.suppliers(project_id, status);
CREATE INDEX IF NOT EXISTS idx_suppliers_project_qual ON public.suppliers(project_id, qualification_status);
CREATE INDEX IF NOT EXISTS idx_suppliers_project_name ON public.suppliers(project_id, name);

-- ── 2. supplier_documents ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'other',
  valid_from date,
  valid_to date,
  status text NOT NULL DEFAULT 'valid',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sd_select" ON public.supplier_documents FOR SELECT
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "sd_insert" ON public.supplier_documents FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "sd_update" ON public.supplier_documents FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "sd_delete" ON public.supplier_documents FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));

CREATE INDEX IF NOT EXISTS idx_sd_project_supplier ON public.supplier_documents(project_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_sd_project_doctype ON public.supplier_documents(project_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_sd_project_validto ON public.supplier_documents(project_id, valid_to);

-- ── 3. supplier_materials ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  is_primary boolean DEFAULT false,
  lead_time_days int,
  unit_price numeric,
  currency text DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sm_select" ON public.supplier_materials FOR SELECT
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "sm_insert" ON public.supplier_materials FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "sm_update" ON public.supplier_materials FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "sm_delete" ON public.supplier_materials FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_sm_unique ON public.supplier_materials(project_id, supplier_id, material_name);

-- ── 4. Indexes on existing FK columns ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_nc_project_supplier ON public.non_conformities(project_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_tr_project_supplier ON public.test_results(project_id, supplier_id);

-- ── 5. fn_create_supplier ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_supplier(
  p_project_id uuid,
  p_name text,
  p_tax_id text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_contact_name text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS suppliers
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_proj_code text;
  v_seq int;
  v_code text;
  v_result public.suppliers;
BEGIN
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  SELECT code INTO v_proj_code FROM public.projects WHERE id = p_project_id;

  SELECT COALESCE(MAX(
    CASE WHEN s.code ~ ('^SUP-' || v_proj_code || '-[0-9]{4,}$')
    THEN substring(s.code FROM length('SUP-' || v_proj_code || '-') + 1)::int
    ELSE 0 END
  ), 0) + 1 INTO v_seq
  FROM public.suppliers s WHERE s.project_id = p_project_id;

  v_code := 'SUP-' || v_proj_code || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.suppliers (
    project_id, code, name, nif_cif, category, country, address,
    contact_name, contact_email, contact_phone, notes, created_by
  ) VALUES (
    p_project_id, v_code, p_name, p_tax_id, p_category, p_country, p_address,
    p_contact_name, p_contact_email, p_contact_phone, p_notes, auth.uid()
  ) RETURNING * INTO v_result;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, auth.uid(), 'suppliers', v_result.id, 'INSERT', 'suppliers',
    jsonb_build_object('code', v_code, 'name', p_name, 'category', p_category));

  RETURN v_result;
END;
$$;

-- ── 6. Views ───────────────────────────────────────────────────────────

-- 6.1 view_suppliers_kpi
CREATE OR REPLACE VIEW public.view_suppliers_kpi WITH (security_invoker = on) AS
SELECT
  s.project_id,
  COUNT(*) AS suppliers_total,
  COUNT(*) FILTER (WHERE s.status = 'active') AS suppliers_active,
  COUNT(*) FILTER (WHERE s.qualification_status = 'pending') AS suppliers_pending_qualification,
  COUNT(*) FILTER (WHERE s.status = 'blocked') AS suppliers_blocked,
  COALESCE((
    SELECT COUNT(*) FROM public.supplier_documents sd
    WHERE sd.project_id = s.project_id AND sd.valid_to IS NOT NULL
      AND sd.valid_to <= CURRENT_DATE + INTERVAL '30 days' AND sd.valid_to > CURRENT_DATE
  ), 0) AS supplier_docs_expiring_30d,
  COALESCE((
    SELECT COUNT(*) FROM public.supplier_documents sd
    WHERE sd.project_id = s.project_id AND sd.valid_to IS NOT NULL AND sd.valid_to < CURRENT_DATE
  ), 0) AS supplier_docs_expired,
  COUNT(DISTINCT s.id) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.non_conformities nc
    WHERE nc.supplier_id = s.id AND nc.status NOT IN ('closed','archived')
  )) AS suppliers_with_open_nc,
  COUNT(DISTINCT s.id) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.test_results tr
    WHERE tr.supplier_id = s.id AND tr.pass_fail = 'fail'
      AND tr.date >= CURRENT_DATE - INTERVAL '30 days'
  )) AS suppliers_with_nonconform_tests_30d
FROM public.suppliers s
GROUP BY s.project_id;

-- 6.2 view_supplier_detail_metrics
CREATE OR REPLACE VIEW public.view_supplier_detail_metrics WITH (security_invoker = on) AS
SELECT
  s.id AS supplier_id,
  s.project_id,
  COALESCE((SELECT COUNT(*) FROM public.non_conformities nc WHERE nc.supplier_id = s.id AND nc.status NOT IN ('closed','archived')), 0) AS open_nc_count,
  COALESCE((SELECT COUNT(*) FROM public.test_results tr WHERE tr.supplier_id = s.id), 0) AS tests_total,
  COALESCE((SELECT COUNT(*) FROM public.test_results tr WHERE tr.supplier_id = s.id AND tr.pass_fail = 'fail'), 0) AS tests_nonconform,
  COALESCE((SELECT COUNT(*) FROM public.supplier_documents sd WHERE sd.supplier_id = s.id AND sd.valid_to IS NOT NULL AND sd.valid_to <= CURRENT_DATE + INTERVAL '30 days' AND sd.valid_to > CURRENT_DATE), 0) AS docs_expiring_30d,
  COALESCE((SELECT COUNT(*) FROM public.supplier_documents sd WHERE sd.supplier_id = s.id AND sd.valid_to IS NOT NULL AND sd.valid_to < CURRENT_DATE), 0) AS docs_expired
FROM public.suppliers s;
