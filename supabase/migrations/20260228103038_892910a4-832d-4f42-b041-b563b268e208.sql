
-- ================================================
-- PLANNING MODULE: WBS + Activities + Smart Blocks
-- ================================================

-- A) WBS Hierarchy
CREATE TABLE public.planning_wbs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.planning_wbs(id) ON DELETE CASCADE,
  wbs_code text NOT NULL,
  description text NOT NULL,
  zone text,
  planned_start date,
  planned_end date,
  responsible text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_planning_wbs_project ON public.planning_wbs(project_id);
CREATE INDEX idx_planning_wbs_parent ON public.planning_wbs(parent_id);

ALTER TABLE public.planning_wbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wbs_select" ON public.planning_wbs FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "wbs_insert" ON public.planning_wbs FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "wbs_update" ON public.planning_wbs FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "wbs_delete" ON public.planning_wbs FOR DELETE USING (is_project_admin(auth.uid(), project_id));

-- B) Planned Activities
CREATE TABLE public.planning_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  wbs_id uuid REFERENCES public.planning_wbs(id) ON DELETE SET NULL,
  work_item_id uuid REFERENCES public.work_items(id) ON DELETE SET NULL,
  subcontractor_id uuid REFERENCES public.subcontractors(id) ON DELETE SET NULL,
  zone text,
  description text NOT NULL,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','blocked','completed','cancelled')),
  constraints_text text,
  requires_topography boolean NOT NULL DEFAULT false,
  requires_tests boolean NOT NULL DEFAULT false,
  requires_ppi boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_planning_act_project ON public.planning_activities(project_id);
CREATE INDEX idx_planning_act_wbs ON public.planning_activities(wbs_id);
CREATE INDEX idx_planning_act_wi ON public.planning_activities(work_item_id);

ALTER TABLE public.planning_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "act_select" ON public.planning_activities FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "act_insert" ON public.planning_activities FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "act_update" ON public.planning_activities FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "act_delete" ON public.planning_activities FOR DELETE USING (is_project_admin(auth.uid(), project_id));

-- C) Smart blocking function: checks if activity can be completed
CREATE OR REPLACE FUNCTION public.fn_check_activity_completion(p_activity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_act planning_activities%ROWTYPE;
  v_blocks jsonb := '[]'::jsonb;
  v_pending_tests int;
  v_pending_ppi int;
  v_pending_topo int;
  v_expired_equip int;
  v_sub_missing_docs int;
BEGIN
  SELECT * INTO v_act FROM planning_activities WHERE id = p_activity_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_complete', false, 'blocks', '["Activity not found"]'::jsonb);
  END IF;

  -- 1) Check pending tests if required
  IF v_act.requires_tests AND v_act.work_item_id IS NOT NULL THEN
    SELECT count(*) INTO v_pending_tests
    FROM test_results
    WHERE work_item_id = v_act.work_item_id
      AND project_id = v_act.project_id
      AND status IN ('pending', 'in_progress');
    IF v_pending_tests > 0 THEN
      v_blocks := v_blocks || jsonb_build_array('Ensaios pendentes: ' || v_pending_tests);
    END IF;
  END IF;

  -- 2) Check pending PPI if required
  IF v_act.requires_ppi AND v_act.work_item_id IS NOT NULL THEN
    SELECT count(*) INTO v_pending_ppi
    FROM ppi_instances
    WHERE work_item_id = v_act.work_item_id
      AND project_id = v_act.project_id
      AND status NOT IN ('approved', 'closed');
    IF v_pending_ppi > 0 THEN
      v_blocks := v_blocks || jsonb_build_array('PPI pendentes: ' || v_pending_ppi);
    END IF;
  END IF;

  -- 3) Check topography if required
  IF v_act.requires_topography AND v_act.work_item_id IS NOT NULL THEN
    SELECT count(*) INTO v_pending_topo
    FROM topography_requests
    WHERE work_item_id = v_act.work_item_id
      AND project_id = v_act.project_id
      AND status NOT IN ('completed', 'cancelled');
    IF v_pending_topo > 0 THEN
      v_blocks := v_blocks || jsonb_build_array('Topografia pendente: ' || v_pending_topo);
    END IF;
  END IF;

  -- 4) Check expired equipment in project
  SELECT count(*) INTO v_expired_equip
  FROM topography_equipment
  WHERE project_id = v_act.project_id
    AND calibration_status = 'expired'
    AND status = 'active';
  IF v_expired_equip > 0 THEN
    v_blocks := v_blocks || jsonb_build_array('Equipamentos com calibração expirada: ' || v_expired_equip);
  END IF;

  -- 5) Check subcontractor docs if assigned
  IF v_act.subcontractor_id IS NOT NULL THEN
    SELECT count(*) INTO v_sub_missing_docs
    FROM subcontractors s
    LEFT JOIN supplier_documents sd ON sd.supplier_id = s.supplier_id AND sd.status = 'valid'
    WHERE s.id = v_act.subcontractor_id
      AND s.supplier_id IS NOT NULL
      AND sd.id IS NULL;
    IF v_sub_missing_docs > 0 THEN
      v_blocks := v_blocks || jsonb_build_array('Subempreiteiro sem documentação válida');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'can_complete', jsonb_array_length(v_blocks) = 0,
    'blocks', v_blocks
  );
END;
$$;

-- D) Trigger to block completion if smart checks fail
CREATE OR REPLACE FUNCTION public.trg_block_activity_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Only check when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    v_result := fn_check_activity_completion(NEW.id);
    IF NOT (v_result->>'can_complete')::boolean THEN
      RAISE EXCEPTION 'Atividade não pode ser concluída. Bloqueios: %', v_result->>'blocks';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_completion_check
  BEFORE UPDATE ON public.planning_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_block_activity_completion();

-- E) Auto-update updated_at on WBS
CREATE TRIGGER trg_wbs_updated_at
  BEFORE UPDATE ON public.planning_wbs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
