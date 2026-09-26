CREATE OR REPLACE FUNCTION fn_update_lot_status(
  p_lot_id        uuid,
  p_new_status    text,
  p_user_id       uuid,
  p_notes         text DEFAULT NULL,
  p_nc_id         uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lot     material_lots%ROWTYPE;
  v_allowed text[] := ARRAY['pending','approved','quarantine','rejected'];
BEGIN
  IF p_new_status != ALL(v_allowed) THEN
    RAISE EXCEPTION 'Estado inválido: %. Valores permitidos: %', p_new_status, array_to_string(v_allowed, ', ');
  END IF;

  SELECT * INTO v_lot FROM material_lots
  WHERE id = p_lot_id AND (is_deleted = false OR is_deleted IS NULL);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote não encontrado: %', p_lot_id;
  END IF;

  IF NOT is_project_member(p_user_id, v_lot.project_id) THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro do projecto';
  END IF;

  UPDATE material_lots SET
    reception_status = p_new_status,
    notes            = COALESCE(p_notes, notes),
    nc_id            = COALESCE(p_nc_id, nc_id),
    approved_by      = CASE WHEN p_new_status = 'approved' THEN p_user_id ELSE approved_by END,
    approved_at      = CASE WHEN p_new_status = 'approved' THEN now() ELSE approved_at END,
    updated_at       = now()
  WHERE id = p_lot_id;

  -- Auditoria com schema correcto
  INSERT INTO audit_log (project_id, user_id, entity, entity_id, action, module, description, diff)
  VALUES (
    v_lot.project_id,
    p_user_id,
    'material_lot',
    p_lot_id::text,
    'update',
    'materials',
    format('Lote %s: %s → %s', v_lot.lot_code, v_lot.reception_status, p_new_status),
    jsonb_build_object('from', v_lot.reception_status, 'to', p_new_status, 'notes', p_notes)
  );

  RETURN jsonb_build_object(
    'success', true,
    'lot_id', p_lot_id,
    'new_status', p_new_status
  );
END;
$$;
