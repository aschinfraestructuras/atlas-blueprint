
-- ═══════════════════════════════════════════════════════════════════════════════
-- PPI PRO — Database enhancements (all-in-one)
-- ═══════════════════════════════════════════════════════════════════════════════

-- A1) Add missing columns to ppi_instances for full workflow tracking
ALTER TABLE public.ppi_instances
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid;

-- A2) Add snapshot columns to ppi_instance_items
ALTER TABLE public.ppi_instance_items
  ADD COLUMN IF NOT EXISTS evidence_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS acceptance_criteria text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- A3) Unique constraint on templates code per project
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ppi_templates_project_id_code_key'
  ) THEN
    ALTER TABLE public.ppi_templates
      ADD CONSTRAINT ppi_templates_project_id_code_key UNIQUE (project_id, code);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Updated fn_create_ppi_instance — copies method/acceptance_criteria/evidence_required
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_create_ppi_instance(
  p_project_id uuid, p_work_item_id uuid,
  p_template_id uuid DEFAULT NULL, p_code text DEFAULT NULL,
  p_inspector_id uuid DEFAULT NULL, p_created_by uuid DEFAULT NULL,
  p_disciplina_outro text DEFAULT NULL, p_inspection_date date DEFAULT NULL
)
RETURNS TABLE(instance_id uuid, generated_code text, items_created integer, had_existing_items boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_code text; v_instance_id uuid; v_items_count int := 0;
  v_existing_items int := 0; v_had_existing boolean := false;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    v_code := public.fn_next_ppi_code(p_project_id);
  ELSE
    v_code := trim(p_code);
    IF EXISTS (SELECT 1 FROM public.ppi_instances WHERE project_id = p_project_id AND code = v_code) THEN
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
    SELECT COUNT(*) INTO v_existing_items FROM public.ppi_instance_items WHERE instance_id = v_instance_id;
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
$fn$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Enhanced transition function with timestamps + validation + readiness recalc
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_ppi_instance_transition(
  p_instance_id uuid, p_to_status text, p_reason text DEFAULT NULL
)
RETURNS ppi_instances
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_current TEXT; v_result public.ppi_instances; v_allowed TEXT[];
  v_pending int;
BEGIN
  SELECT status INTO v_current FROM public.ppi_instances WHERE id = p_instance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PPI instance not found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ppi_instances i
    WHERE i.id = p_instance_id AND public.is_project_member(auth.uid(), i.project_id)
  ) THEN RAISE EXCEPTION 'Access denied'; END IF;

  v_allowed := CASE v_current
    WHEN 'draft'       THEN ARRAY['in_progress', 'archived']
    WHEN 'in_progress' THEN ARRAY['submitted',   'archived']
    WHEN 'submitted'   THEN ARRAY['approved',    'rejected', 'archived']
    WHEN 'rejected'    THEN ARRAY['in_progress', 'archived']
    WHEN 'approved'    THEN ARRAY['archived']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (p_to_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_current, p_to_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Block submit/approve if pending items exist
  IF p_to_status IN ('submitted', 'approved') THEN
    SELECT COUNT(*) INTO v_pending FROM public.ppi_instance_items
    WHERE instance_id = p_instance_id AND result = 'pending';
    IF v_pending > 0 THEN
      RAISE EXCEPTION 'Existem % item(s) pendentes de revisão.', v_pending
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Reject requires reason
  IF p_to_status = 'rejected' AND (p_reason IS NULL OR trim(p_reason) = '') THEN
    RAISE EXCEPTION 'A rejeição requer justificação.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.ppi_instances SET
    status           = p_to_status,
    closed_at        = CASE WHEN p_to_status IN ('approved','rejected','archived') THEN now()
                            WHEN p_to_status = 'in_progress' THEN NULL ELSE closed_at END,
    submitted_at     = CASE WHEN p_to_status = 'submitted' THEN now() ELSE submitted_at END,
    submitted_by     = CASE WHEN p_to_status = 'submitted' THEN auth.uid() ELSE submitted_by END,
    approved_at      = CASE WHEN p_to_status = 'approved' THEN now() ELSE approved_at END,
    approved_by      = CASE WHEN p_to_status = 'approved' THEN auth.uid() ELSE approved_by END,
    rejected_at      = CASE WHEN p_to_status = 'rejected' THEN now() ELSE rejected_at END,
    rejected_by      = CASE WHEN p_to_status = 'rejected' THEN auth.uid() ELSE rejected_by END,
    rejection_reason = CASE WHEN p_to_status = 'rejected' THEN p_reason ELSE rejection_reason END,
    archived_at      = CASE WHEN p_to_status = 'archived' THEN now() ELSE archived_at END,
    archived_by      = CASE WHEN p_to_status = 'archived' THEN auth.uid() ELSE archived_by END,
    updated_at       = now()
  WHERE id = p_instance_id
  RETURNING * INTO v_result;

  INSERT INTO public.audit_log (project_id, user_id, entity, entity_id, action, diff, module)
  SELECT v_result.project_id, auth.uid(), 'ppi_instances', p_instance_id, 'STATUS_CHANGE',
         jsonb_build_object('from', v_current, 'to', p_to_status, 'reason', p_reason), 'ppi';

  IF v_result.work_item_id IS NOT NULL THEN
    PERFORM public.fn_recalc_work_item_readiness(v_result.work_item_id);
  END IF;

  RETURN v_result;
END;
$fn$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- KPI View
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.vw_ppi_kpis AS
WITH inst_stats AS (
  SELECT
    i.project_id,
    COUNT(*) FILTER (WHERE NOT i.is_deleted) AS total,
    COUNT(*) FILTER (WHERE NOT i.is_deleted AND i.status = 'draft') AS draft_count,
    COUNT(*) FILTER (WHERE NOT i.is_deleted AND i.status = 'in_progress') AS in_progress_count,
    COUNT(*) FILTER (WHERE NOT i.is_deleted AND i.status = 'submitted') AS submitted_count,
    COUNT(*) FILTER (WHERE NOT i.is_deleted AND i.status = 'approved') AS approved_count,
    COUNT(*) FILTER (WHERE NOT i.is_deleted AND i.status = 'rejected') AS rejected_count,
    COUNT(*) FILTER (WHERE NOT i.is_deleted AND i.status = 'archived') AS archived_count,
    COUNT(*) FILTER (WHERE NOT i.is_deleted AND i.status = 'submitted'
      AND i.submitted_at IS NOT NULL AND i.submitted_at < now() - interval '7 days') AS overdue_approval
  FROM public.ppi_instances i
  GROUP BY i.project_id
),
item_stats AS (
  SELECT i.project_id,
    COUNT(*) FILTER (WHERE ii.result = 'pass') AS items_pass,
    COUNT(*) FILTER (WHERE ii.result = 'fail') AS items_fail,
    COUNT(*) FILTER (WHERE ii.result = 'pending') AS items_pending
  FROM public.ppi_instances i
  JOIN public.ppi_instance_items ii ON ii.instance_id = i.id
  WHERE NOT i.is_deleted
  GROUP BY i.project_id
),
cycle_stats AS (
  SELECT project_id,
    ROUND(AVG(EXTRACT(EPOCH FROM (approved_at - opened_at)) / 86400)::numeric, 1) AS avg_cycle_days
  FROM public.ppi_instances
  WHERE status = 'approved' AND approved_at IS NOT NULL AND NOT is_deleted
  GROUP BY project_id
)
SELECT s.project_id, s.total, s.draft_count, s.in_progress_count, s.submitted_count,
  s.approved_count, s.rejected_count, s.archived_count, s.overdue_approval,
  COALESCE(it.items_pass, 0)::bigint AS items_pass,
  COALESCE(it.items_fail, 0)::bigint AS items_fail,
  COALESCE(it.items_pending, 0)::bigint AS items_pending,
  c.avg_cycle_days
FROM inst_stats s
LEFT JOIN item_stats it ON it.project_id = s.project_id
LEFT JOIN cycle_stats c ON c.project_id = s.project_id;
