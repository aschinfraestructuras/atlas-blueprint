-- ═══════════════════════════════════════════════════════════════════════════
-- PPI Execution Layer — Production Grade Upgrade
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add requires_nc + nc_id columns to ppi_instance_items
ALTER TABLE public.ppi_instance_items
  ADD COLUMN IF NOT EXISTS requires_nc BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nc_id UUID REFERENCES public.non_conformities(id) ON DELETE SET NULL;

-- 2. Update result default to 'pending' (already exists as valid value in the check)
-- Ensure the check constraint includes all valid values
ALTER TABLE public.ppi_instance_items
  DROP CONSTRAINT IF EXISTS ppi_instance_items_result_check;

ALTER TABLE public.ppi_instance_items
  ADD CONSTRAINT ppi_instance_items_result_check
  CHECK (result IN ('pending', 'ok', 'nok', 'na', 'pass', 'fail'));

-- 3. Create server-side status transition validation function
CREATE OR REPLACE FUNCTION public.fn_ppi_instance_transition(
  p_instance_id UUID,
  p_to_status   TEXT
) RETURNS public.ppi_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current    TEXT;
  v_closed_at  TIMESTAMPTZ := NULL;
  v_result     public.ppi_instances;
  v_allowed    TEXT[];
BEGIN
  -- Lock and read current status
  SELECT status INTO v_current
  FROM public.ppi_instances
  WHERE id = p_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PPI instance not found: %', p_instance_id;
  END IF;

  -- Validate membership (caller must be project member)
  IF NOT EXISTS (
    SELECT 1 FROM public.ppi_instances i
    WHERE i.id = p_instance_id
      AND public.is_project_member(auth.uid(), i.project_id)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Define allowed transitions
  v_allowed := CASE v_current
    WHEN 'draft'       THEN ARRAY['in_progress']
    WHEN 'in_progress' THEN ARRAY['submitted']
    WHEN 'submitted'   THEN ARRAY['approved', 'rejected']
    WHEN 'rejected'    THEN ARRAY['in_progress']
    WHEN 'approved'    THEN ARRAY['archived']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (p_to_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid transition: % → %. Allowed from %: %',
      v_current, p_to_status, v_current, array_to_string(v_allowed, ', ')
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Auto-set closed_at for terminal states
  IF p_to_status IN ('approved', 'rejected', 'archived') THEN
    v_closed_at := now();
  END IF;

  UPDATE public.ppi_instances
  SET status    = p_to_status,
      closed_at = v_closed_at,
      updated_at = now()
  WHERE id = p_instance_id
  RETURNING * INTO v_result;

  -- Audit log
  INSERT INTO public.audit_log (project_id, user_id, entity, entity_id, action, diff)
  SELECT v_result.project_id, auth.uid(), 'ppi_instances', p_instance_id, 'status_change',
         jsonb_build_object('from', v_current, 'to', p_to_status);

  RETURN v_result;
END;
$$;

-- 4. Create bulk item update function for "mark all OK"
CREATE OR REPLACE FUNCTION public.fn_ppi_bulk_mark_ok(
  p_instance_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Validate access
  IF NOT EXISTS (
    SELECT 1 FROM public.ppi_instances i
    WHERE i.id = p_instance_id
      AND public.is_project_member(auth.uid(), i.project_id)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.ppi_instance_items
  SET result     = 'ok',
      checked_by = auth.uid(),
      checked_at = now()
  WHERE instance_id = p_instance_id
    AND result = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- 5. Create bulk save function for item updates
CREATE OR REPLACE FUNCTION public.fn_ppi_bulk_save_items(
  p_instance_id UUID,
  p_items JSONB  -- Array of {id, result, notes}
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item    JSONB;
  v_count   INTEGER := 0;
BEGIN
  -- Validate access
  IF NOT EXISTS (
    SELECT 1 FROM public.ppi_instances i
    WHERE i.id = p_instance_id
      AND public.is_project_member(auth.uid(), i.project_id)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.ppi_instance_items
    SET result     = (v_item->>'result')::TEXT,
        notes      = v_item->>'notes',
        requires_nc = COALESCE((v_item->>'result') IN ('nok', 'fail'), false),
        checked_by = auth.uid(),
        checked_at = now()
    WHERE id        = (v_item->>'id')::UUID
      AND instance_id = p_instance_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
