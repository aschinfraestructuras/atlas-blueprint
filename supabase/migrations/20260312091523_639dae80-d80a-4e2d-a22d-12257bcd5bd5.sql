-- =====================================================
-- FIX 1: fn_work_item_report — add project membership check
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_work_item_report(p_work_item_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_id uuid;
  v_result JSON;
BEGIN
  -- Resolve project_id and verify membership
  SELECT project_id INTO v_project_id
  FROM public.work_items WHERE id = p_work_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work item not found: %', p_work_item_id;
  END IF;

  IF NOT public.is_project_member(auth.uid(), v_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  SELECT json_build_object(
    'work_item', (
      SELECT row_to_json(wi)
      FROM work_items wi
      WHERE wi.id = p_work_item_id
    ),
    'ppi_instances', (
      SELECT COALESCE(json_agg(json_build_object(
        'code',          pi.code,
        'template_name', COALESCE(pt.title, pi.code),
        'status',        pi.status,
        'items', (
          SELECT COALESCE(json_agg(json_build_object(
            'description', pii.label,
            'point_type',  COALESCE(pii.check_code, ''),
            'status',      pii.result,
            'observation', pii.notes
          ) ORDER BY pii.item_no), '[]'::json)
          FROM ppi_instance_items pii
          WHERE pii.instance_id = pi.id
        )
      )), '[]'::json)
      FROM ppi_instances pi
      LEFT JOIN ppi_templates pt ON pt.id = pi.template_id
      WHERE pi.work_item_id = p_work_item_id
        AND pi.is_deleted = false
    ),
    'test_results', (
      SELECT COALESCE(json_agg(json_build_object(
        'test_name',       tc.name,
        'standard',        tc.standard,
        'date',            tr.date,
        'result_status',   tr.result_status,
        'sample_ref',      tr.sample_ref,
        'laboratory_name', s.name,
        'report_number',   tr.report_number
      ) ORDER BY tr.date DESC), '[]'::json)
      FROM test_results tr
      JOIN tests_catalog tc ON tc.id = tr.test_id
      LEFT JOIN suppliers s ON s.id = tr.supplier_id
      WHERE tr.work_item_id = p_work_item_id
        AND tr.is_deleted = false
    ),
    'non_conformities', (
      SELECT COALESCE(json_agg(json_build_object(
        'code',     nc.code,
        'title',    COALESCE(nc.title, nc.description),
        'status',   nc.status,
        'severity', nc.severity,
        'due_date', nc.due_date
      ) ORDER BY nc.created_at DESC), '[]'::json)
      FROM non_conformities nc
      WHERE nc.work_item_id = p_work_item_id
        AND nc.is_deleted = false
    ),
    'materials', (
      SELECT COALESCE(json_agg(json_build_object(
        'material_name', m.name,
        'pame_status',   m.approval_status,
        'quantity',      wim.quantity,
        'unit',          wim.unit
      )), '[]'::json)
      FROM work_item_materials wim
      JOIN materials m ON m.id = wim.material_id
      WHERE wim.work_item_id = p_work_item_id
    )
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- =====================================================
-- FIX 2: fn_create_ppi_instance — add project membership check
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_create_ppi_instance(p_project_id uuid, p_work_item_id uuid, p_template_id uuid DEFAULT NULL::uuid, p_code text DEFAULT NULL::text, p_inspector_id uuid DEFAULT NULL::uuid, p_created_by uuid DEFAULT NULL::uuid, p_disciplina_outro text DEFAULT NULL::text, p_inspection_date date DEFAULT NULL::date)
 RETURNS TABLE(instance_id uuid, generated_code text, items_created integer, had_existing_items boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text; v_instance_id uuid; v_items_count int := 0;
  v_existing_items int := 0; v_had_existing boolean := false;
BEGIN
  -- Verify caller is a project member
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  IF p_code IS NULL OR trim(p_code) = '' THEN
    v_code := public.fn_next_ppi_code(p_project_id);
  ELSE
    v_code := trim(p_code);
    IF EXISTS (SELECT 1 FROM public.ppi_instances pi WHERE pi.project_id = p_project_id AND pi.code = v_code) THEN
      RAISE EXCEPTION 'PPI code already exists: %', v_code USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  INSERT INTO public.ppi_instances (
    project_id, work_item_id, template_id, code, status,
    inspector_id, created_by, disciplina_outro, inspection_date
  ) VALUES (
    p_project_id, p_work_item_id, p_template_id, v_code, 'draft',
    p_inspector_id, p_created_by, p_disciplina_outro, COALESCE(p_inspection_date, CURRENT_DATE)
  ) RETURNING id INTO v_instance_id;

  IF p_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_items
    FROM public.ppi_instance_items pii
    WHERE pii.instance_id = v_instance_id;

    IF v_existing_items > 0 THEN
      v_had_existing := true; v_items_count := v_existing_items;
    ELSE
      INSERT INTO public.ppi_instance_items (
        instance_id, item_no, check_code, label, result,
        evidence_required, method, acceptance_criteria, sort_order
      )
      SELECT v_instance_id, ti.item_no, ti.check_code, ti.label, 'pending',
             ti.evidence_required, ti.method, ti.acceptance_criteria, ti.sort_order
      FROM public.ppi_template_items ti WHERE ti.template_id = p_template_id
      ORDER BY ti.sort_order, ti.item_no;
      GET DIAGNOSTICS v_items_count = ROW_COUNT;
    END IF;
  END IF;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, COALESCE(p_created_by, auth.uid()), 'ppi_instances', v_instance_id, 'INSERT', 'ppi',
          jsonb_build_object('code', v_code, 'template_id', p_template_id, 'items', v_items_count));

  RETURN QUERY SELECT v_instance_id, v_code, v_items_count, v_had_existing;
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$function$;

-- =====================================================
-- FIX 3: audit_log INSERT — add project membership check
-- =====================================================
DROP POLICY IF EXISTS "audit_log_insert_authenticated" ON public.audit_log;

CREATE POLICY "audit_log_insert_authenticated"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL)
  AND ((user_id = auth.uid()) OR (user_id IS NULL))
  AND ((performed_by = auth.uid()) OR (performed_by IS NULL))
  AND ((project_id IS NULL) OR is_project_member(auth.uid(), project_id))
);

-- =====================================================
-- FIX 4: notifications INSERT — restrict user_id to project members
-- =====================================================
DROP POLICY IF EXISTS "notifications_insert_member" ON public.notifications;

CREATE POLICY "notifications_insert_member"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  is_project_member(auth.uid(), project_id)
  AND (user_id IN (
    SELECT pm.user_id FROM public.project_members pm
    WHERE pm.project_id = notifications.project_id AND pm.is_active = true
  ))
);