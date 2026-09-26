-- Criar NC automática a partir de um lote não conforme
CREATE OR REPLACE FUNCTION public.fn_create_reception_nc(p_lot_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lot    public.material_lots%ROWTYPE;
  v_mat    public.materials%ROWTYPE;
  v_nc_id  uuid;
  v_code   text;
BEGIN
  SELECT * INTO v_lot FROM public.material_lots WHERE id = p_lot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote não encontrado'; END IF;

  SELECT * INTO v_mat FROM public.materials WHERE id = v_lot.material_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Material não encontrado'; END IF;

  -- Gerar código NC via função existente
  SELECT public.fn_create_nc(
    p_project_id  := v_lot.project_id,
    p_title       := 'Recepção não conforme — ' || v_mat.name || ' (' || v_lot.lot_code || ')',
    p_description := COALESCE(v_lot.rejection_reason, 'Lote recepcionado em estado não conforme. Verificar condições de entrega e marcação CE.'),
    p_severity    := 'major',
    p_category    := 'materiais',
    p_origin      := 'recepcao_material',
    p_supplier_id := v_lot.supplier_id,
    p_detected_at := v_lot.reception_date
  ) INTO v_nc_id;

  -- Ligar NC ao lote
  UPDATE public.material_lots SET nc_id = v_nc_id WHERE id = p_lot_id;

  -- Atualizar status do lote para quarentena se não estava já rejeitado
  UPDATE public.material_lots
  SET reception_status = 'quarantine'
  WHERE id = p_lot_id AND reception_status NOT IN ('rejected', 'quarantine');

  -- Obter código da NC criada
  SELECT code INTO v_code FROM public.non_conformities WHERE id = v_nc_id;

  RETURN json_build_object('id', v_nc_id, 'code', v_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_reception_nc(uuid) TO authenticated;
