
-- ═══════════════════════════════════════════════════════════════
-- ATLAS — Módulo Ensaios: Migration v1
-- Enriquece tests_catalog e test_results sem eliminar dados
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. TESTS_CATALOG: colunas adicionais ────────────────────

-- Disciplina (alinhada com work_items e ppi_templates)
ALTER TABLE public.tests_catalog
  ADD COLUMN IF NOT EXISTS disciplina        text NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS disciplina_outro  text,
  ADD COLUMN IF NOT EXISTS material          text,
  ADD COLUMN IF NOT EXISTS material_outro    text,
  ADD COLUMN IF NOT EXISTS laboratorio       text,
  ADD COLUMN IF NOT EXISTS laboratorio_outro text,
  ADD COLUMN IF NOT EXISTS standards         text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description       text,
  ADD COLUMN IF NOT EXISTS unit              text,
  ADD COLUMN IF NOT EXISTS created_by        uuid;

-- ─── 2. TEST_RESULTS: novo workflow + rastreabilidade ─────────

-- 2a. Remover o CHECK constraint antigo (4 estados) para substituir
ALTER TABLE public.test_results
  DROP CONSTRAINT IF EXISTS test_results_status_check;

-- 2b. Adicionar colunas de rastreabilidade
ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS code              text,
  ADD COLUMN IF NOT EXISTS report_number     text,
  ADD COLUMN IF NOT EXISTS pk_inicio         numeric,
  ADD COLUMN IF NOT EXISTS pk_fim            numeric,
  ADD COLUMN IF NOT EXISTS material          text,
  ADD COLUMN IF NOT EXISTS material_outro    text,
  ADD COLUMN IF NOT EXISTS result_payload    jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pass_fail         text,
  ADD COLUMN IF NOT EXISTS created_by        uuid,
  ADD COLUMN IF NOT EXISTS updated_by        uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by       uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by       uuid,
  ADD COLUMN IF NOT EXISTS approved_at       timestamptz,
  ADD COLUMN IF NOT EXISTS notes             text,
  ADD COLUMN IF NOT EXISTS subcontractor_id  uuid REFERENCES public.subcontractors(id) ON DELETE SET NULL;

-- 2c. Novo CHECK constraint com workflow completo
ALTER TABLE public.test_results
  ADD CONSTRAINT test_results_status_check
  CHECK (status IN ('draft','in_progress','completed','approved','archived','pending','pass','fail','inconclusive'));

-- 2d. CHECK constraint para pass_fail
ALTER TABLE public.test_results
  ADD CONSTRAINT test_results_pass_fail_check
  CHECK (pass_fail IS NULL OR pass_fail IN ('pass','fail','inconclusive','na'));

-- ─── 3. Índices úteis ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_test_results_project_status
  ON public.test_results(project_id, status);

CREATE INDEX IF NOT EXISTS idx_test_results_work_item
  ON public.test_results(work_item_id) WHERE work_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_test_results_code
  ON public.test_results(project_id, code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tests_catalog_disciplina
  ON public.tests_catalog(project_id, disciplina);

-- ─── 4. Unique constraint para code dentro do projeto ─────────
-- (code pode ser null → usa unique com condição)
CREATE UNIQUE INDEX IF NOT EXISTS uq_test_results_project_code
  ON public.test_results(project_id, code)
  WHERE code IS NOT NULL;

-- ─── 5. RPC: fn_create_test_result ───────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_test_result(
  p_project_id   uuid,
  p_test_id      uuid,
  p_date         date DEFAULT CURRENT_DATE,
  p_code         text DEFAULT NULL,
  p_sample_ref   text DEFAULT NULL,
  p_location     text DEFAULT NULL,
  p_pk_inicio    numeric DEFAULT NULL,
  p_pk_fim       numeric DEFAULT NULL,
  p_material     text DEFAULT NULL,
  p_report_number text DEFAULT NULL,
  p_supplier_id  uuid DEFAULT NULL,
  p_work_item_id uuid DEFAULT NULL,
  p_result_payload jsonb DEFAULT '{}'::jsonb,
  p_notes        text DEFAULT NULL
)
RETURNS public.test_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code   text;
  v_result public.test_results;
  v_proj_code text;
  v_seq    int;
BEGIN
  -- Validate membership
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  -- Auto-generate code if not provided
  IF p_code IS NULL OR trim(p_code) = '' THEN
    SELECT code INTO v_proj_code FROM public.projects WHERE id = p_project_id;
    SELECT COALESCE(MAX(
      CASE WHEN tr.code ~ ('^ENS-' || v_proj_code || '-[0-9]{4,}$')
      THEN substring(tr.code FROM length('ENS-' || v_proj_code || '-') + 1)::int
      ELSE 0 END
    ), 0) + 1 INTO v_seq
    FROM public.test_results tr
    WHERE tr.project_id = p_project_id;
    v_code := 'ENS-' || v_proj_code || '-' || lpad(v_seq::text, 4, '0');
  ELSE
    v_code := trim(p_code);
    IF EXISTS (SELECT 1 FROM public.test_results WHERE project_id = p_project_id AND code = v_code) THEN
      RAISE EXCEPTION 'Test result code already exists: %', v_code USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  INSERT INTO public.test_results (
    project_id, test_id, date, code, status,
    sample_ref, location, pk_inicio, pk_fim, material,
    report_number, supplier_id, work_item_id,
    result_payload, result, notes, created_by
  ) VALUES (
    p_project_id, p_test_id, p_date, v_code, 'draft',
    p_sample_ref, p_location, p_pk_inicio, p_pk_fim, p_material,
    p_report_number, p_supplier_id, p_work_item_id,
    p_result_payload, '{}', p_notes, auth.uid()
  )
  RETURNING * INTO v_result;

  -- Audit log
  INSERT INTO public.audit_log (project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, auth.uid(), 'test_results', v_result.id, 'INSERT', 'tests',
          jsonb_build_object('code', v_code, 'test_id', p_test_id, 'date', p_date));

  RETURN v_result;
END;
$$;

-- ─── 6. RPC: fn_update_test_status (with transition guard) ───
CREATE OR REPLACE FUNCTION public.fn_update_test_status(
  p_result_id  uuid,
  p_to_status  text
)
RETURNS public.test_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current   text;
  v_project   uuid;
  v_allowed   text[];
  v_result    public.test_results;
  v_approved_by uuid := NULL;
  v_approved_at timestamptz := NULL;
  v_reviewed_by uuid := NULL;
  v_reviewed_at timestamptz := NULL;
BEGIN
  SELECT status, project_id INTO v_current, v_project
  FROM public.test_results WHERE id = p_result_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test result not found: %', p_result_id;
  END IF;

  IF NOT public.is_project_member(auth.uid(), v_project) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Transition table
  v_allowed := CASE v_current
    WHEN 'draft'       THEN ARRAY['in_progress', 'archived']
    WHEN 'pending'     THEN ARRAY['in_progress', 'archived']
    WHEN 'in_progress' THEN ARRAY['completed',   'archived']
    WHEN 'completed'   THEN ARRAY['approved',    'in_progress', 'archived']
    WHEN 'approved'    THEN ARRAY['archived']
    WHEN 'pass'        THEN ARRAY['approved',    'archived']
    WHEN 'fail'        THEN ARRAY['in_progress', 'archived']
    WHEN 'inconclusive'THEN ARRAY['in_progress', 'archived']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_to_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid transition: % → %. Allowed: %',
      v_current, p_to_status, array_to_string(v_allowed, ', ')
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_to_status = 'approved' THEN
    v_approved_by := auth.uid();
    v_approved_at := now();
  END IF;
  IF p_to_status = 'completed' THEN
    v_reviewed_by := auth.uid();
    v_reviewed_at := now();
  END IF;

  UPDATE public.test_results SET
    status      = p_to_status,
    updated_by  = auth.uid(),
    updated_at  = now(),
    approved_by = COALESCE(v_approved_by, approved_by),
    approved_at = COALESCE(v_approved_at, approved_at),
    reviewed_by = COALESCE(v_reviewed_by, reviewed_by),
    reviewed_at = COALESCE(v_reviewed_at, reviewed_at)
  WHERE id = p_result_id
  RETURNING * INTO v_result;

  INSERT INTO public.audit_log (project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (v_project, auth.uid(), 'test_results', p_result_id, 'STATUS_CHANGE', 'tests',
          jsonb_build_object('from', v_current, 'to', p_to_status));

  RETURN v_result;
END;
$$;

-- ─── 7. RPC: fn_bulk_export_tests ─────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_bulk_export_tests(
  p_project_id uuid,
  p_ids        uuid[] DEFAULT NULL
)
RETURNS TABLE(
  id            uuid,
  code          text,
  test_name     text,
  test_code     text,
  standard      text,
  date          date,
  status        text,
  pass_fail     text,
  sample_ref    text,
  location      text,
  pk_inicio     numeric,
  pk_fim        numeric,
  material      text,
  report_number text,
  notes         text,
  created_by    uuid,
  approved_by   uuid,
  approved_at   timestamptz,
  result_payload jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    tr.id,
    tr.code,
    tc.name          AS test_name,
    tc.code          AS test_code,
    tc.standard,
    tr.date,
    tr.status,
    tr.pass_fail,
    tr.sample_ref,
    tr.location,
    tr.pk_inicio,
    tr.pk_fim,
    tr.material,
    tr.report_number,
    tr.notes,
    tr.created_by,
    tr.approved_by,
    tr.approved_at,
    tr.result_payload
  FROM public.test_results tr
  JOIN public.tests_catalog tc ON tc.id = tr.test_id
  WHERE tr.project_id = p_project_id
    AND (p_ids IS NULL OR tr.id = ANY(p_ids))
  ORDER BY tr.date DESC, tr.code;
END;
$$;

-- ─── 8. set_updated_at trigger para test_results ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_test_results_updated_at'
  ) THEN
    CREATE TRIGGER trg_test_results_updated_at
      BEFORE UPDATE ON public.test_results
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tests_catalog_updated_at'
  ) THEN
    CREATE TRIGGER trg_tests_catalog_updated_at
      BEFORE UPDATE ON public.tests_catalog
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
