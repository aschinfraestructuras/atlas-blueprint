-- Secção 5: resultado da inspecção HP
ALTER TABLE hp_notifications
  ADD COLUMN IF NOT EXISTS hp_result          text CHECK (hp_result IN ('approved','approved_conditions','rejected')),
  ADD COLUMN IF NOT EXISTS result_datetime    timestamptz,
  ADD COLUMN IF NOT EXISTS result_observations text,
  ADD COLUMN IF NOT EXISTS rnc_ref            text,
  ADD COLUMN IF NOT EXISTS result_registered_at  timestamptz,
  ADD COLUMN IF NOT EXISTS result_registered_by  uuid REFERENCES auth.users(id),

-- Upload de documentos assinados (array de paths no storage qms-files)
  ADD COLUMN IF NOT EXISTS signed_doc_paths   text[]  DEFAULT '{}',

-- Token de confirmação externa (para F/IP confirmar sem login)
  ADD COLUMN IF NOT EXISTS confirmation_token        uuid  UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmation_token_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_token_email   text;

-- RPC pública para confirmação externa pela F/IP (sem autenticação)
CREATE OR REPLACE FUNCTION public.fn_confirm_hp_by_token(
  p_token      uuid,
  p_name       text,
  p_entity     text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec hp_notifications;
BEGIN
  -- Verificar token válido e não usado
  SELECT * INTO v_rec
  FROM hp_notifications
  WHERE confirmation_token = p_token
    AND confirmation_token_used_at IS NULL
    AND is_voided IS NOT TRUE
    AND is_deleted IS NOT TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou já utilizado.');
  END IF;

  -- Se já confirmada por outro meio, aceitar mas registar
  UPDATE hp_notifications SET
    status                     = 'confirmed',
    confirmed_at               = COALESCE(confirmed_at, now()),
    confirmed_by               = COALESCE(confirmed_by, p_name),
    approved_by_name           = COALESCE(approved_by_name, p_name),
    approved_entity            = COALESCE(approved_entity, p_entity),
    confirmation_token_used_at = now(),
    confirmation_token_email   = p_name
  WHERE id = v_rec.id;

  RETURN jsonb_build_object(
    'success',    true,
    'code',       v_rec.code,
    'ppi_ref',    v_rec.ppi_ref,
    'point_no',   v_rec.point_no,
    'activity',   v_rec.activity,
    'planned_at', v_rec.planned_datetime
  );
END;
$$;

-- Garantir que a função é pública (anon pode chamar)
GRANT EXECUTE ON FUNCTION public.fn_confirm_hp_by_token(uuid, text, text) TO anon, authenticated;
