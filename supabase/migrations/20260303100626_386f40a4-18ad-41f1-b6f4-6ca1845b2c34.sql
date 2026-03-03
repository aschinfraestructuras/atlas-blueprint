
-- ============================================================================
-- ENSAIOS PRO — Phase 1: Test Plans, Due Items, Templates, Laboratories
-- ============================================================================

-- A1) Test Plans (ITP/PIE)
CREATE TABLE public.test_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id),
  code          text NOT NULL,
  title         text NOT NULL,
  status        text NOT NULL DEFAULT 'draft',
  scope_disciplina text DEFAULT 'geral',
  scope_notes   text,
  approved_by   uuid,
  approved_at   timestamptz,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  is_deleted    boolean NOT NULL DEFAULT false,
  deleted_at    timestamptz,
  deleted_by    uuid,
  UNIQUE(project_id, code)
);

-- Validation trigger for status (instead of CHECK)
CREATE OR REPLACE FUNCTION public.trg_validate_test_plan_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'active', 'archived') THEN
    RAISE EXCEPTION 'Invalid test_plan status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_test_plans_validate
  BEFORE INSERT OR UPDATE ON public.test_plans
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_test_plan_status();

CREATE INDEX idx_test_plans_project ON public.test_plans(project_id) WHERE is_deleted = false;

ALTER TABLE public.test_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view test_plans" ON public.test_plans FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Members can insert test_plans" ON public.test_plans FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Members can update test_plans" ON public.test_plans FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Admins can delete test_plans" ON public.test_plans FOR DELETE
  USING (public.is_project_admin(auth.uid(), project_id));

-- A1.b) Test Plan Rules
CREATE TABLE public.test_plan_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             uuid NOT NULL REFERENCES public.test_plans(id) ON DELETE CASCADE,
  test_id             uuid NOT NULL REFERENCES public.tests_catalog(id),
  applies_to          text NOT NULL DEFAULT 'both',
  disciplina          text DEFAULT 'geral',
  work_item_filter    jsonb DEFAULT '{}',
  activity_filter     jsonb DEFAULT '{}',
  frequency_type      text NOT NULL DEFAULT 'manual',
  frequency_value     numeric,
  frequency_unit      text,
  event_triggers      text[] DEFAULT '{}',
  default_lab_supplier_id uuid REFERENCES public.suppliers(id),
  requires_report     boolean NOT NULL DEFAULT true,
  requires_photos     boolean NOT NULL DEFAULT false,
  requires_witness    boolean NOT NULL DEFAULT false,
  acceptance_criteria_override text,
  standards_override  text[],
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  is_active           boolean NOT NULL DEFAULT true
);

-- Validation triggers for enums
CREATE OR REPLACE FUNCTION public.trg_validate_test_plan_rule()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.applies_to NOT IN ('work_item', 'activity', 'both') THEN
    RAISE EXCEPTION 'Invalid applies_to: %', NEW.applies_to;
  END IF;
  IF NEW.frequency_type NOT IN ('quantity', 'time', 'event', 'manual') THEN
    RAISE EXCEPTION 'Invalid frequency_type: %', NEW.frequency_type;
  END IF;
  IF NEW.frequency_unit IS NOT NULL AND NEW.frequency_unit NOT IN ('m','m2','m3','t','lot','layer','day','week','month') THEN
    RAISE EXCEPTION 'Invalid frequency_unit: %', NEW.frequency_unit;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_test_plan_rules_validate
  BEFORE INSERT OR UPDATE ON public.test_plan_rules
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_test_plan_rule();

CREATE INDEX idx_test_plan_rules_plan ON public.test_plan_rules(plan_id) WHERE is_active = true;

ALTER TABLE public.test_plan_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view test_plan_rules" ON public.test_plan_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.test_plans tp
    WHERE tp.id = test_plan_rules.plan_id
      AND public.is_project_member(auth.uid(), tp.project_id)
  ));
CREATE POLICY "Members can insert test_plan_rules" ON public.test_plan_rules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.test_plans tp
    WHERE tp.id = test_plan_rules.plan_id
      AND public.is_project_member(auth.uid(), tp.project_id)
  ));
CREATE POLICY "Members can update test_plan_rules" ON public.test_plan_rules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.test_plans tp
    WHERE tp.id = test_plan_rules.plan_id
      AND public.is_project_member(auth.uid(), tp.project_id)
  ));
CREATE POLICY "Members can delete test_plan_rules" ON public.test_plan_rules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.test_plans tp
    WHERE tp.id = test_plan_rules.plan_id
      AND public.is_project_admin(auth.uid(), tp.project_id)
  ));

-- A2) Test Due Items (backlog)
CREATE TABLE public.test_due_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES public.projects(id),
  plan_rule_id            uuid NOT NULL REFERENCES public.test_plan_rules(id),
  work_item_id            uuid REFERENCES public.work_items(id),
  activity_id             uuid REFERENCES public.planning_activities(id),
  due_reason              text NOT NULL DEFAULT 'manual',
  due_at_date             date,
  due_at_quantity          numeric,
  status                  text NOT NULL DEFAULT 'due',
  scheduled_for           date,
  assigned_lab_supplier_id uuid REFERENCES public.suppliers(id),
  related_test_result_id  uuid REFERENCES public.test_results(id),
  waived_reason           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  is_deleted              boolean NOT NULL DEFAULT false,
  deleted_at              timestamptz,
  deleted_by              uuid
);

CREATE OR REPLACE FUNCTION public.trg_validate_test_due_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('due', 'scheduled', 'in_progress', 'done', 'overdue', 'waived') THEN
    RAISE EXCEPTION 'Invalid test_due_items status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_test_due_items_validate
  BEFORE INSERT OR UPDATE ON public.test_due_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_test_due_status();

CREATE INDEX idx_test_due_project_status ON public.test_due_items(project_id, status) WHERE is_deleted = false;
CREATE INDEX idx_test_due_work_item ON public.test_due_items(work_item_id) WHERE is_deleted = false;
CREATE INDEX idx_test_due_activity ON public.test_due_items(activity_id) WHERE is_deleted = false;

ALTER TABLE public.test_due_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view test_due_items" ON public.test_due_items FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Members can insert test_due_items" ON public.test_due_items FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Members can update test_due_items" ON public.test_due_items FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Admins can delete test_due_items" ON public.test_due_items FOR DELETE
  USING (public.is_project_admin(auth.uid(), project_id));

-- A3) Test Templates (form_schema)
CREATE TABLE public.test_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id),
  test_id      uuid NOT NULL REFERENCES public.tests_catalog(id),
  version      integer NOT NULL DEFAULT 1,
  title        text NOT NULL,
  form_schema  jsonb NOT NULL DEFAULT '{}',
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_templates_test ON public.test_templates(test_id, project_id) WHERE is_active = true;

ALTER TABLE public.test_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view test_templates" ON public.test_templates FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Members can insert test_templates" ON public.test_templates FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Members can update test_templates" ON public.test_templates FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));

-- A4) Laboratories (1–1 with suppliers)
CREATE TABLE public.laboratories (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES public.projects(id),
  supplier_id         uuid NOT NULL REFERENCES public.suppliers(id),
  accreditation_body  text,
  accreditation_code  text,
  scope               text,
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  is_deleted          boolean NOT NULL DEFAULT false,
  deleted_at          timestamptz,
  deleted_by          uuid,
  UNIQUE(project_id, supplier_id)
);

CREATE INDEX idx_laboratories_project ON public.laboratories(project_id) WHERE is_deleted = false;

ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view laboratories" ON public.laboratories FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Members can insert laboratories" ON public.laboratories FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Members can update laboratories" ON public.laboratories FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Admins can delete laboratories" ON public.laboratories FOR DELETE
  USING (public.is_project_admin(auth.uid(), project_id));

-- B1) RPC: Generate due tests
CREATE OR REPLACE FUNCTION public.fn_generate_due_tests(
  p_project_id uuid,
  p_date_from date DEFAULT CURRENT_DATE - interval '30 days',
  p_date_to date DEFAULT CURRENT_DATE + interval '30 days'
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rule   record;
  v_wi     record;
  v_act    record;
  v_count  int := 0;
BEGIN
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- For each active rule in active plans
  FOR v_rule IN
    SELECT r.*, tp.project_id AS tp_project_id
    FROM public.test_plan_rules r
    JOIN public.test_plans tp ON tp.id = r.plan_id
    WHERE tp.project_id = p_project_id
      AND tp.status = 'active'
      AND tp.is_deleted = false
      AND r.is_active = true
  LOOP
    -- Event-based: for activities
    IF v_rule.applies_to IN ('activity', 'both') AND v_rule.frequency_type = 'event' THEN
      FOR v_act IN
        SELECT pa.id, pa.work_item_id
        FROM public.planning_activities pa
        WHERE pa.project_id = p_project_id
          AND pa.requires_tests = true
          AND pa.status = 'in_progress'
          AND NOT EXISTS (
            SELECT 1 FROM public.test_due_items tdi
            WHERE tdi.plan_rule_id = v_rule.id
              AND tdi.activity_id = pa.id
              AND tdi.is_deleted = false
          )
      LOOP
        INSERT INTO public.test_due_items (
          project_id, plan_rule_id, activity_id, work_item_id,
          due_reason, due_at_date, status,
          assigned_lab_supplier_id
        ) VALUES (
          p_project_id, v_rule.id, v_act.id, v_act.work_item_id,
          'activity_in_progress', CURRENT_DATE, 'due',
          v_rule.default_lab_supplier_id
        );
        v_count := v_count + 1;
      END LOOP;
    END IF;

    -- Time-based: periodic
    IF v_rule.frequency_type = 'time' AND v_rule.frequency_value IS NOT NULL THEN
      -- Create one due item per period if not exists
      IF NOT EXISTS (
        SELECT 1 FROM public.test_due_items tdi
        WHERE tdi.plan_rule_id = v_rule.id
          AND tdi.is_deleted = false
          AND tdi.status IN ('due', 'scheduled', 'in_progress')
          AND tdi.due_at_date >= p_date_from
      ) THEN
        INSERT INTO public.test_due_items (
          project_id, plan_rule_id,
          due_reason, due_at_date, status,
          assigned_lab_supplier_id
        ) VALUES (
          p_project_id, v_rule.id,
          'periodic', CURRENT_DATE, 'due',
          v_rule.default_lab_supplier_id
        );
        v_count := v_count + 1;
      END IF;
    END IF;

    -- Manual / quantity: create one per work_item in progress that doesn't have one
    IF v_rule.applies_to IN ('work_item', 'both') AND v_rule.frequency_type IN ('quantity', 'manual') THEN
      FOR v_wi IN
        SELECT wi.id
        FROM public.work_items wi
        WHERE wi.project_id = p_project_id
          AND wi.is_deleted = false
          AND wi.status IN ('in_progress', 'active')
          AND (v_rule.disciplina IS NULL OR v_rule.disciplina = 'geral' OR wi.disciplina = v_rule.disciplina)
          AND NOT EXISTS (
            SELECT 1 FROM public.test_due_items tdi
            WHERE tdi.plan_rule_id = v_rule.id
              AND tdi.work_item_id = wi.id
              AND tdi.is_deleted = false
              AND tdi.status IN ('due', 'scheduled', 'in_progress')
          )
      LOOP
        INSERT INTO public.test_due_items (
          project_id, plan_rule_id, work_item_id,
          due_reason, due_at_date, status,
          assigned_lab_supplier_id
        ) VALUES (
          p_project_id, v_rule.id, v_wi.id,
          CASE WHEN v_rule.frequency_type = 'quantity' THEN 'quantity_threshold' ELSE 'manual_rule' END,
          CURRENT_DATE, 'due',
          v_rule.default_lab_supplier_id
        );
        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- Audit
  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, description, diff)
  VALUES (p_project_id, auth.uid(), 'test_due_items', NULL, 'INSERT', 'tests',
          'Generated ' || v_count || ' due test items',
          jsonb_build_object('count', v_count, 'date_from', p_date_from, 'date_to', p_date_to));

  RETURN v_count;
END;
$$;

-- B1.b) Link due to result
CREATE OR REPLACE FUNCTION public.fn_link_due_to_result(p_due_id uuid, p_test_result_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_due public.test_due_items;
BEGIN
  SELECT * INTO v_due FROM public.test_due_items WHERE id = p_due_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Due item not found'; END IF;
  IF NOT public.is_project_member(auth.uid(), v_due.project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.test_due_items
  SET related_test_result_id = p_test_result_id,
      status = 'done',
      updated_at = now()
  WHERE id = p_due_id;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (v_due.project_id, auth.uid(), 'test_due_items', p_due_id, 'UPDATE', 'tests',
          jsonb_build_object('linked_result', p_test_result_id));
END;
$$;

-- B1.c) Waive due test
CREATE OR REPLACE FUNCTION public.fn_waive_due_test(p_due_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_due public.test_due_items;
BEGIN
  SELECT * INTO v_due FROM public.test_due_items WHERE id = p_due_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Due item not found'; END IF;
  IF NOT public.is_project_member(auth.uid(), v_due.project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.test_due_items
  SET status = 'waived',
      waived_reason = p_reason,
      updated_at = now()
  WHERE id = p_due_id;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (v_due.project_id, auth.uid(), 'test_due_items', p_due_id, 'STATUS_CHANGE', 'tests',
          jsonb_build_object('to', 'waived', 'reason', p_reason));
END;
$$;

-- Add template_id and template_version columns to test_results for traceability
ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.test_templates(id),
  ADD COLUMN IF NOT EXISTS template_version integer;
