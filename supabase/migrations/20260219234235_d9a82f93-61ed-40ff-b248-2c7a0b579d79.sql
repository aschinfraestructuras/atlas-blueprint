-- 1. Add inspection_date to ppi_instances (nullable, default today)
ALTER TABLE public.ppi_instances
  ADD COLUMN IF NOT EXISTS inspection_date date DEFAULT CURRENT_DATE;

-- 2. Add disciplina_outro to work_items (already exists in ppi tables, now adding to work_items)
ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS disciplina_outro text DEFAULT NULL;

-- 3. Update fn_create_ppi_instance to accept and use inspection_date
CREATE OR REPLACE FUNCTION public.fn_create_ppi_instance(
  p_project_id        uuid,
  p_work_item_id      uuid,
  p_template_id       uuid    DEFAULT NULL,
  p_code              text    DEFAULT NULL,
  p_inspector_id      uuid    DEFAULT NULL,
  p_created_by        uuid    DEFAULT NULL,
  p_disciplina_outro  text    DEFAULT NULL,
  p_inspection_date   date    DEFAULT NULL
)
RETURNS TABLE(instance_id uuid, generated_code text, items_created integer, had_existing_items boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code            text;
  v_instance_id     uuid;
  v_items_count     int     := 0;
  v_existing_items  int     := 0;
  v_had_existing    boolean := false;
  v_inspection_date date;
BEGIN
  -- Resolve inspection date (default to today if not provided)
  v_inspection_date := COALESCE(p_inspection_date, CURRENT_DATE);

  -- ── 1. Resolve / auto-generate code ──────────────────────────────────────
  IF p_code IS NULL OR trim(p_code) = '' THEN
    v_code := public.fn_next_ppi_code(p_project_id);
  ELSE
    v_code := trim(p_code);
    -- Verify uniqueness
    IF EXISTS (
      SELECT 1
      FROM public.ppi_instances pi
      WHERE pi.project_id = p_project_id
        AND pi.code = v_code
    ) THEN
      RAISE EXCEPTION 'PPI code already exists in this project: %', v_code
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- ── 2. Insert the instance ────────────────────────────────────────────────
  INSERT INTO public.ppi_instances (
    project_id, work_item_id, template_id, code, status,
    inspector_id, created_by, disciplina_outro, inspection_date
  )
  VALUES (
    p_project_id, p_work_item_id, p_template_id, v_code, 'draft',
    p_inspector_id, p_created_by, p_disciplina_outro, v_inspection_date
  )
  RETURNING ppi_instances.id INTO v_instance_id;

  -- ── 3. Copy template items (if template provided) ─────────────────────────
  IF p_template_id IS NOT NULL THEN
    -- Guard: check if items already exist (fully-qualified alias to avoid ambiguity)
    SELECT COUNT(*)
      INTO v_existing_items
      FROM public.ppi_instance_items ii
     WHERE ii.instance_id = v_instance_id;

    IF v_existing_items > 0 THEN
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
        'pending',
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
    RAISE;
END;
$function$;