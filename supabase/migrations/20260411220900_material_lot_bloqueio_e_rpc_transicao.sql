-- 1. Adicionar FK lot_id à daily_report_materials para rastreabilidade real
ALTER TABLE daily_report_materials
  ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES material_lots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_drm_lot_id ON daily_report_materials(lot_id)
  WHERE lot_id IS NOT NULL;

-- 2. Trigger de bloqueio: impede uso de lote não libertado
CREATE OR REPLACE FUNCTION fn_block_unreleased_lot()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Só bloquear se lot_id foi especificado
  IF NEW.lot_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verificar estado do lote
  IF NOT EXISTS (
    SELECT 1 FROM material_lots
    WHERE id = NEW.lot_id
      AND reception_status = 'approved'
      AND (is_deleted = false OR is_deleted IS NULL)
  ) THEN
    RAISE EXCEPTION 'Lote não libertado: só lotes com estado "approved" podem ser consumidos em obra. Verifique o estado do lote antes de registar.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_unreleased_lot ON daily_report_materials;
CREATE TRIGGER trg_block_unreleased_lot
  BEFORE INSERT OR UPDATE ON daily_report_materials
  FOR EACH ROW EXECUTE FUNCTION fn_block_unreleased_lot();

-- 3. RPC de transição de estado do lote (libertar / quarentena / rejeitar)
CREATE OR REPLACE FUNCTION fn_update_lot_status(
  p_lot_id        uuid,
  p_new_status    text,   -- 'approved' | 'quarantine' | 'rejected' | 'pending'
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
  -- Validar estado destino
  IF p_new_status != ALL(v_allowed) THEN
    RAISE EXCEPTION 'Estado inválido: %. Valores permitidos: %', p_new_status, array_to_string(v_allowed, ', ');
  END IF;

  -- Carregar lote
  SELECT * INTO v_lot FROM material_lots WHERE id = p_lot_id AND (is_deleted = false OR is_deleted IS NULL);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote não encontrado: %', p_lot_id;
  END IF;

  -- Verificar membro do projecto
  IF NOT is_project_member(p_user_id, v_lot.project_id) THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro do projecto';
  END IF;

  -- Actualizar estado
  UPDATE material_lots SET
    reception_status = p_new_status,
    notes            = COALESCE(p_notes, notes),
    nc_id            = COALESCE(p_nc_id, nc_id),
    approved_by      = CASE WHEN p_new_status = 'approved' THEN p_user_id ELSE approved_by END,
    approved_at      = CASE WHEN p_new_status = 'approved' THEN now() ELSE approved_at END,
    updated_at       = now()
  WHERE id = p_lot_id;

  -- Log de auditoria
  INSERT INTO audit_log (project_id, user_id, entity_type, entity_id, action, new_values)
  VALUES (
    v_lot.project_id, p_user_id, 'material_lot', p_lot_id,
    'status_change',
    jsonb_build_object(
      'from', v_lot.reception_status,
      'to', p_new_status,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'lot_id', p_lot_id,
    'new_status', p_new_status
  );
END;
$$;
