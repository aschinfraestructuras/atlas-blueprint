-- Fecha o ciclo: ao criar um test_result, procura test_due_items pendentes
-- para o mesmo tipo de ensaio + projecto e marca-os como done
CREATE OR REPLACE FUNCTION public.fn_complete_due_from_result(
  p_test_result_id uuid,
  p_project_id     uuid,
  p_test_id        uuid,
  p_work_item_id   uuid DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_due_id uuid;
  v_closed int := 0;
BEGIN
  -- Encontrar due_items pendentes para este tipo de ensaio, sem result já ligado
  -- Prioritiza o due_item do mesmo work_item se existir
  SELECT tdi.id INTO v_due_id
  FROM public.test_due_items tdi
  JOIN public.test_plan_rules tpr ON tpr.id = tdi.plan_rule_id
  WHERE tdi.project_id = p_project_id
    AND tpr.test_id = p_test_id
    AND tdi.related_test_result_id IS NULL
    AND tdi.status NOT IN ('done', 'waived')
    AND tdi.is_deleted = false
  ORDER BY
    -- Preferir o do mesmo work_item
    CASE WHEN p_work_item_id IS NOT NULL AND tdi.work_item_id = p_work_item_id THEN 0 ELSE 1 END,
    tdi.due_at_date ASC
  LIMIT 1;

  IF v_due_id IS NOT NULL THEN
    UPDATE public.test_due_items
    SET
      related_test_result_id = p_test_result_id,
      status = 'done',
      updated_at = now()
    WHERE id = v_due_id;

    GET DIAGNOSTICS v_closed = ROW_COUNT;
  END IF;

  RETURN v_closed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_complete_due_from_result(uuid, uuid, uuid, uuid) TO authenticated;
