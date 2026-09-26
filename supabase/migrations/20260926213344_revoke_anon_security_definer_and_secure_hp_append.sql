-- Segurança: fechar funções SECURITY DEFINER expostas ao role anon
--
-- 1) fn_hp_append_signed_doc não validava nada: qualquer pessoa (anon/PUBLIC)
--    podia acrescentar caminhos a signed_doc_paths de qualquer notificação HP.
--    Passa a exigir membro do projeto e deixa de ser executável por anon.
-- 2) Revoga EXECUTE a anon/PUBLIC em funções que só fazem sentido com sessão
--    (fleet_*, fn_create_nc) e em funções de trigger (não precisam de EXECUTE
--    para disparar).
-- Mantêm-se públicas, por design, fn_preview_hp_by_token e
-- fn_confirm_hp_by_token (página /confirm-hp, validadas por token).

CREATE OR REPLACE FUNCTION public.fn_hp_append_signed_doc(p_id uuid, p_path text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT project_id INTO v_project_id FROM hp_notifications WHERE id = p_id;
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'HP notification not found';
  END IF;
  IF NOT public.is_project_member((SELECT auth.uid()), v_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;
  UPDATE hp_notifications
  SET signed_doc_paths = array_append(COALESCE(signed_doc_paths, '{}'), p_path)
  WHERE id = p_id;
END;
$function$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN (
        'fn_hp_append_signed_doc',
        'fn_create_nc',
        'fleet_is_manager',
        'fn_fleet_dashboard_manager',
        'fn_fleet_dashboard_worker',
        'fn_fleet_global_report',
        'fleet_calc_submission',
        'fleet_handle_new_user',
        'fleet_set_updated_at',
        'fn_sgq_meeting_code',
        'fn_sup_eval_calc',
        'fn_sup_eval_updated_at'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.fn);
  END LOOP;
END $$;
