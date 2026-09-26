-- 1. Gerar tokens para notificações existentes sem token
UPDATE hp_notifications
SET confirmation_token = gen_random_uuid()
WHERE confirmation_token IS NULL;

-- 2. RPC segura para append de documentos (evita race conditions)
CREATE OR REPLACE FUNCTION public.fn_hp_append_signed_doc(
  p_id   uuid,
  p_path text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE hp_notifications
  SET signed_doc_paths = array_append(COALESCE(signed_doc_paths, '{}'), p_path)
  WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.fn_hp_append_signed_doc(uuid, text) TO authenticated;
