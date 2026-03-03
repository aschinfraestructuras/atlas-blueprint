
-- Fix fn_ppi_bulk_mark_ok to use 'pass' instead of 'ok'
CREATE OR REPLACE FUNCTION public.fn_ppi_bulk_mark_ok(p_instance_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ppi_instances i
    WHERE i.id = p_instance_id
      AND public.is_project_member(auth.uid(), i.project_id)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.ppi_instance_items
  SET result     = 'pass',
      checked_by = auth.uid(),
      checked_at = now()
  WHERE instance_id = p_instance_id
    AND result = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- Fix fn_ppi_bulk_save_items to map ok→pass and nok→fail
CREATE OR REPLACE FUNCTION public.fn_ppi_bulk_save_items(p_instance_id uuid, p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_item    JSONB;
  v_count   INTEGER := 0;
  v_result  TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ppi_instances i
    WHERE i.id = p_instance_id
      AND public.is_project_member(auth.uid(), i.project_id)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_result := (v_item->>'result')::TEXT;
    -- Normalize legacy values
    IF v_result = 'ok' THEN v_result := 'pass'; END IF;
    IF v_result = 'nok' THEN v_result := 'fail'; END IF;

    UPDATE public.ppi_instance_items
    SET result     = v_result,
        notes      = v_item->>'notes',
        requires_nc = COALESCE(v_result IN ('fail'), false),
        checked_by = auth.uid(),
        checked_at = now()
    WHERE id        = (v_item->>'id')::UUID
      AND instance_id = p_instance_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
