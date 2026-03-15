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
RETURNS TABLE(
  instance_id        uuid,
  generated_code     text,
  items_created      integer,
  had_existing_items boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code            text;
  v_instance_id     uuid;
  v_items_count     int  := 0;
  v_existing_items  int  := 0;
  v_had_existing    boolean := false;
BEGIN
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  IF p_code IS NULL OR trim(p_code) = '' THEN
    v_code := public.fn_next_ppi_code(p_project_id);
  ELSE
    v_code := trim(p_code);
    IF EXISTS (
      SELECT 1 FROM public.ppi_instances pi
      WHERE pi.project_id = p_project_id AND pi.code = v_code
    ) THEN
      RAISE EXCEPTION 'PPI code already exists: %', v_code
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  INSERT INTO public.ppi_instances (
    project_id, work_item_id, template_id, code, status,
    inspector_id, created_by, disciplina_outro, inspection_date
  )
  VALUES (
    p_project_id, p_work_item_id, p_template_id, v_code, 'draft',
    p_inspector_id, p_created_by, p_disciplina_outro, COALESCE(p_inspection_date, CURRENT_DATE)
  )
  RETURNING ppi_instances.id INTO v_instance_id;

  IF p_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_items
    FROM public.ppi_instance_items ii
    WHERE ii.instance_id = v_instance_id;

    IF v_existing_items > 0 THEN
      v_had_existing := true;
      v_items_count  := v_existing_items;
    ELSE
      INSERT INTO public.ppi_instance_items (
        instance_id,
        item_no,
        check_code,
        label,
        method,
        acceptance_criteria,
        inspection_point_type,
        ipt_e,
        ipt_f,
        ipt_ip,
        evidence_required,
        sort_order,
        result,
        notes,
        checked_by,
        checked_at
      )
      SELECT
        v_instance_id,
        ti.item_no,
        ti.check_code,
        ti.label,
        ti.method,
        ti.acceptance_criteria,
        ti.ipt_e,
        ti.ipt_e,
        ti.ipt_f,
        ti.ipt_ip,
        ti.evidence_required,
        ti.sort_order,
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

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, COALESCE(p_created_by, auth.uid()), 'ppi_instances', v_instance_id, 'INSERT', 'ppi',
          jsonb_build_object('code', v_code, 'template_id', p_template_id, 'items', v_items_count));

  RETURN QUERY
  SELECT v_instance_id, v_code, v_items_count, v_had_existing;
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;