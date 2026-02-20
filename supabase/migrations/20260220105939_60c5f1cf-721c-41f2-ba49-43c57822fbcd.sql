-- Fix fn_ppi_instance_transition to allow:
-- draft → archived (new)
-- draft → in_progress (existing)
-- in_progress → submitted (existing)
-- submitted → approved / rejected (existing)
-- rejected → in_progress (existing)
-- approved → archived (existing)

CREATE OR REPLACE FUNCTION public.fn_ppi_instance_transition(p_instance_id uuid, p_to_status text)
 RETURNS ppi_instances
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- draft can go to in_progress OR archived (to clean up drafts)
  v_allowed := CASE v_current
    WHEN 'draft'       THEN ARRAY['in_progress', 'archived']
    WHEN 'in_progress' THEN ARRAY['submitted',   'archived']
    WHEN 'submitted'   THEN ARRAY['approved',    'rejected', 'archived']
    WHEN 'rejected'    THEN ARRAY['in_progress', 'archived']
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
$function$;
