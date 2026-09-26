-- CORRECÇÃO CRÍTICA: fn_generate_due_tests NÃO deve processar regras 'manual'
-- Manual = o inspector cria manualmente quando necessário, não se gera em bulk
-- Também revertemos planned → apenas in_progress/active (obra real)
CREATE OR REPLACE FUNCTION public.fn_generate_due_tests(
  p_project_id uuid,
  p_date_from  date DEFAULT (CURRENT_DATE - interval '30 days'),
  p_date_to    date DEFAULT (CURRENT_DATE + interval '30 days')
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rule   record;
  v_wi     record;
  v_act    record;
  v_count  int := 0;
BEGIN
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR v_rule IN
    SELECT r.*, tp.project_id AS tp_project_id
    FROM public.test_plan_rules r
    JOIN public.test_plans tp ON tp.id = r.plan_id
    WHERE tp.project_id = p_project_id
      AND tp.status = 'active'
      AND tp.is_deleted = false
      AND r.is_active = true
      AND r.frequency_type != 'manual'   -- NUNCA gerar manual em bulk
  LOOP
    -- Event-based: actividades em progresso
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
          due_reason, due_at_date, status, assigned_lab_supplier_id
        ) VALUES (
          p_project_id, v_rule.id, v_act.id, v_act.work_item_id,
          'activity_in_progress', CURRENT_DATE, 'due',
          v_rule.default_lab_supplier_id
        );
        v_count := v_count + 1;
      END LOOP;
    END IF;

    -- Time-based: periódico
    IF v_rule.frequency_type = 'time' AND v_rule.frequency_value IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.test_due_items tdi
        WHERE tdi.plan_rule_id = v_rule.id
          AND tdi.is_deleted = false
          AND tdi.status IN ('due', 'scheduled', 'in_progress')
          AND tdi.due_at_date >= p_date_from
      ) THEN
        INSERT INTO public.test_due_items (
          project_id, plan_rule_id,
          due_reason, due_at_date, status, assigned_lab_supplier_id
        ) VALUES (
          p_project_id, v_rule.id,
          'periodic', CURRENT_DATE, 'due',
          v_rule.default_lab_supplier_id
        );
        v_count := v_count + 1;
      END IF;
    END IF;

    -- Quantity-based: apenas WIs em in_progress ou active (obra real)
    IF v_rule.applies_to IN ('work_item', 'both') AND v_rule.frequency_type = 'quantity' THEN
      FOR v_wi IN
        SELECT wi.id
        FROM public.work_items wi
        WHERE wi.project_id = p_project_id
          AND wi.is_deleted = false
          AND wi.status IN ('in_progress', 'active')   -- NOT 'planned'
          AND (
            v_rule.disciplina IS NULL
            OR v_rule.disciplina = 'geral'
            OR wi.disciplina = v_rule.disciplina
          )
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
          due_reason, due_at_date, status, assigned_lab_supplier_id
        ) VALUES (
          p_project_id, v_rule.id, v_wi.id,
          'quantity_threshold',
          CURRENT_DATE, 'due',
          v_rule.default_lab_supplier_id
        );
        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, description, diff)
  VALUES (p_project_id, auth.uid(), 'test_due_items', NULL, 'INSERT', 'tests',
          'Generated ' || v_count || ' due test items',
          jsonb_build_object('count', v_count, 'date_from', p_date_from, 'date_to', p_date_to));

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_due_tests(uuid, date, date) TO authenticated;
