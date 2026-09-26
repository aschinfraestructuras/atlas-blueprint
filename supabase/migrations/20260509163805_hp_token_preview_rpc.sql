-- RPC pública para pré-visualizar detalhes do HP pelo token (não consome o token)
CREATE OR REPLACE FUNCTION public.fn_preview_hp_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rec hp_notifications;
BEGIN
  SELECT * INTO v_rec
  FROM hp_notifications
  WHERE confirmation_token = p_token
    AND is_voided IS NOT TRUE
    AND is_deleted IS NOT TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found',         true,
    'already_used',  v_rec.confirmation_token_used_at IS NOT NULL,
    'code',          v_rec.code,
    'ppi_ref',       v_rec.ppi_ref,
    'point_no',      v_rec.point_no,
    'activity',      v_rec.activity,
    'location_pk',   v_rec.location_pk,
    'planned_at',    v_rec.planned_datetime,
    'status',        v_rec.status,
    'confirmed_by',  v_rec.confirmed_by
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_preview_hp_by_token(uuid) TO anon, authenticated;
