
-- =============================================================================
-- PPI Instance Creation — Deterministic Logic
-- 1. Add 'pending' to result CHECK (semantic: "not yet reviewed")
-- 2. Create fn_create_ppi_instance — atomic, transactional, with auto-code
-- =============================================================================

-- ─── 1. Expand result CHECK to include 'pending' ─────────────────────────────
-- 'na' = Not Applicable (user explicitly marks as N/A)
-- 'pending' = Not Yet Reviewed (initial state when cloned from template)
-- 'pass' / 'fail' = reviewed outcomes

ALTER TABLE public.ppi_instance_items
  DROP CONSTRAINT IF EXISTS ppi_instance_items_result_check;

ALTER TABLE public.ppi_instance_items
  ADD CONSTRAINT ppi_instance_items_result_check
    CHECK (result IN ('pending', 'na', 'pass', 'fail'));

-- Migrate any existing 'na' rows that were created as initial state
-- (Only rows where checked_at IS NULL — i.e. not yet actually reviewed)
UPDATE public.ppi_instance_items
  SET result = 'pending'
  WHERE result = 'na'
    AND checked_at IS NULL
    AND checked_by IS NULL;

-- ─── 2. Auto-code generation function ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_next_ppi_code(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_code text;
  v_prefix       text;
  v_max_seq      int := 0;
  v_seq          int;
BEGIN
  -- Get project code
  SELECT code INTO v_project_code
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  v_prefix := 'PPI-' || v_project_code || '-';

  -- Find the highest existing sequence number for this project
  SELECT COALESCE(MAX(
    CASE
      WHEN pi.code ~ ('^' || v_prefix || '[0-9]{4,}$')
      THEN substring(pi.code FROM length(v_prefix) + 1)::int
      ELSE 0
    END
  ), 0) INTO v_max_seq
  FROM public.ppi_instances pi
  WHERE pi.project_id = p_project_id;

  v_seq := v_max_seq + 1;

  RETURN v_prefix || lpad(v_seq::text, 4, '0');
END;
$$;

-- ─── 3. Main creation function — fully transactional ─────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_ppi_instance(
  p_project_id      uuid,
  p_work_item_id    uuid,
  p_template_id     uuid    DEFAULT NULL,
  p_code            text    DEFAULT NULL,
  p_inspector_id    uuid    DEFAULT NULL,
  p_created_by      uuid    DEFAULT NULL,
  p_disciplina_outro text   DEFAULT NULL
)
RETURNS TABLE (
  instance_id    uuid,
  generated_code text,
  items_created  int,
  had_existing_items boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code            text;
  v_instance_id     uuid;
  v_items_count     int := 0;
  v_existing_items  int := 0;
  v_had_existing    boolean := false;
BEGIN
  -- ── 1. Resolve / auto-generate code ──────────────────────────────────────
  IF p_code IS NULL OR trim(p_code) = '' THEN
    v_code := public.fn_next_ppi_code(p_project_id);
  ELSE
    v_code := trim(p_code);
    -- Verify uniqueness
    IF EXISTS (
      SELECT 1 FROM public.ppi_instances
      WHERE project_id = p_project_id AND code = v_code
    ) THEN
      RAISE EXCEPTION 'PPI code already exists in this project: %', v_code
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- ── 2. Insert the instance ────────────────────────────────────────────────
  INSERT INTO public.ppi_instances (
    project_id, work_item_id, template_id, code, status,
    inspector_id, created_by, disciplina_outro
  )
  VALUES (
    p_project_id, p_work_item_id, p_template_id, v_code, 'draft',
    p_inspector_id, p_created_by, p_disciplina_outro
  )
  RETURNING id INTO v_instance_id;

  -- ── 3. Copy template items (if template provided) ─────────────────────────
  IF p_template_id IS NOT NULL THEN

    -- Guard: check if items already exist (prevents duplicate copying)
    SELECT COUNT(*) INTO v_existing_items
    FROM public.ppi_instance_items
    WHERE instance_id = v_instance_id;

    IF v_existing_items > 0 THEN
      -- Already has items — skip silently, report it
      v_had_existing := true;
      v_items_count  := v_existing_items;
    ELSE
      -- Clone template items with result = 'pending'
      INSERT INTO public.ppi_instance_items (
        instance_id, item_no, check_code, label, result,
        notes, checked_by, checked_at
      )
      SELECT
        v_instance_id,
        ti.item_no,
        ti.check_code,
        ti.label,
        'pending',   -- semantic: not yet reviewed
        NULL,
        NULL,
        NULL
      FROM public.ppi_template_items ti
      WHERE ti.template_id = p_template_id
      ORDER BY ti.sort_order ASC, ti.item_no ASC;

      GET DIAGNOSTICS v_items_count = ROW_COUNT;
    END IF;
  END IF;

  -- ── 4. Return result ──────────────────────────────────────────────────────
  RETURN QUERY
  SELECT v_instance_id, v_code, v_items_count, v_had_existing;

EXCEPTION
  WHEN OTHERS THEN
    -- Full rollback on any error (guaranteed by plpgsql exception block)
    RAISE;
END;
$$;

-- ─── 4. Verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE v_code text;
BEGIN
  -- Verify fn_next_ppi_code is callable (using a known project if any exist)
  PERFORM public.fn_create_ppi_instance(
    gen_random_uuid(),  -- fake project_id — will fail FK, but tests the function compiles
    gen_random_uuid()
  );
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE '✅ fn_create_ppi_instance compiled and FK-validated correctly';
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Project not found%' THEN
      RAISE NOTICE '✅ fn_create_ppi_instance compiled and project-validated correctly';
    ELSE
      RAISE EXCEPTION 'Unexpected error during fn_create_ppi_instance verification: %', SQLERRM;
    END IF;
END $$;
