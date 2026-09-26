-- Função: ao recepcionar um lote aprovado, criar test_due_items baseados nas
-- regras do plano de ensaios que têm event_triggers contendo 'lot_received'
-- e que estão activas para o projecto do material.
CREATE OR REPLACE FUNCTION public.fn_lot_received_create_due_tests(
  p_lot_id   uuid,
  p_work_item_id uuid DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lot        public.material_lots%ROWTYPE;
  v_mat        public.materials%ROWTYPE;
  v_rule       RECORD;
  v_due_date   date;
  v_created    int := 0;
BEGIN
  -- Carregar lote e material
  SELECT * INTO v_lot FROM public.material_lots WHERE id = p_lot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote não encontrado'; END IF;

  SELECT * INTO v_mat FROM public.materials WHERE id = v_lot.material_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Material não encontrado'; END IF;

  -- Apenas para lotes aprovados
  IF v_lot.reception_status != 'approved' THEN
    RETURN 0;
  END IF;

  -- Percorrer regras activas do plano de ensaios do projecto
  -- que têm 'lot_received' nos event_triggers e se aplicam à disciplina do material
  FOR v_rule IN
    SELECT tpr.id, tpr.test_id, tpr.default_lab_supplier_id, tpr.frequency_type
    FROM public.test_plan_rules tpr
    JOIN public.test_plans tp ON tp.id = tpr.plan_id
    WHERE tp.project_id = v_mat.project_id
      AND tpr.is_active = true
      AND (
        tpr.event_triggers @> '["lot_received"]'::jsonb
        OR tpr.event_triggers::text ILIKE '%lot_received%'
      )
      -- Filtrar por disciplina se a regra tiver restrição
      AND (tpr.disciplina IS NULL OR tpr.disciplina = '' OR tpr.disciplina = v_mat.disciplina OR v_mat.disciplina IS NULL)
  LOOP
    -- Data prevista: data de recepção + 7 dias por defeito
    v_due_date := v_lot.reception_date + INTERVAL '7 days';

    -- Inserir apenas se não existir já um item pendente idêntico para este lote
    INSERT INTO public.test_due_items (
      project_id,
      plan_rule_id,
      work_item_id,
      due_reason,
      due_at_date,
      status,
      assigned_lab_supplier_id,
      is_deleted
    )
    SELECT
      v_mat.project_id,
      v_rule.id,
      COALESCE(p_work_item_id, v_lot.work_item_id),  -- work_item_id no lote (se existir)
      'Recepção lote ' || v_lot.lot_code,
      v_due_date,
      'pending',
      v_rule.default_lab_supplier_id,
      false
    WHERE NOT EXISTS (
      SELECT 1 FROM public.test_due_items
      WHERE plan_rule_id = v_rule.id
        AND due_reason = 'Recepção lote ' || v_lot.lot_code
        AND is_deleted = false
    );

    IF FOUND THEN v_created := v_created + 1; END IF;
  END LOOP;

  RETURN v_created;
END;
$$;

-- Adicionar coluna work_item_id a material_lots se não existir
-- (para rastrear onde o lote vai ser aplicado)
ALTER TABLE public.material_lots
  ADD COLUMN IF NOT EXISTS work_item_id uuid REFERENCES public.work_items(id);

GRANT EXECUTE ON FUNCTION public.fn_lot_received_create_due_tests(uuid, uuid) TO authenticated;
