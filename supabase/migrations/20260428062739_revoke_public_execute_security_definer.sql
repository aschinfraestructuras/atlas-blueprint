-- Em PostgreSQL, REVOKE de anon/authenticated não chega se PUBLIC tem acesso.
-- Revogar de PUBLIC e re-conceder só a authenticated onde é necessário.

-- ─── FUNÇÕES DE TRIGGER — revogar de PUBLIC completamente ──────────────────
-- São chamadas por triggers internos, nunca via RPC.
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn()                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_audit_trigger()                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ppi_set_updated_at()                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_tc_updated_at()                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_risk_updated_at()                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_ppi_materialize_tests_on_start()      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_propagate_material_block_doc()        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_propagate_material_block_nc()         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_propagate_material_block_test()       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_block_activity_completion()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_fn_notify_hp_missing()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_fn_recalc_readiness()                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_fn_training_signed_update_worker()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_validate_dfo_item_status()           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_validate_hp_notification_status()    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_validate_ppi_item_check()            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_validate_test_approval()             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_add_creator_as_project_admin()        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_block_unreleased_lot()                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_check_equipment_calibration()         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_check_subcontractor_docs()            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_update_equipment_calibration_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.storage_path_project_id(text)            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_set_risk_code()                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_set_technical_change_code()           FROM PUBLIC;

-- ─── FUNÇÕES DE NEGÓCIO — revogar de PUBLIC, re-conceder a authenticated ───
-- Utilizadores autenticados precisam delas; anónimos não.

DO $do$
DECLARE fns text[] := ARRAY[
  'fn_accept_project_invite(text)',
  'fn_bulk_export_tests(uuid,uuid[])',
  'fn_check_activity_completion(uuid)',
  'fn_check_and_increment_rate_limit(uuid,uuid,integer)',
  'fn_claim_my_pending_invites()',
  'fn_complete_due_from_result(uuid,uuid,uuid,uuid)',
  'fn_create_document(uuid,text,text,text,text,text,text,text)',
  'fn_create_material(uuid,text,text,text,text,text,text,text)',
  'fn_create_nc_from_ppi_item(uuid,text,text,date)',
  'fn_create_nc_from_test(uuid,text,text,date)',
  'fn_create_new_version(uuid,text,text,bigint,text,text)',
  'fn_create_ppi_instance(uuid,uuid,uuid,text,uuid,uuid,text,date)',
  'fn_create_reception_nc(uuid)',
  'fn_create_supplier(uuid,text,text,text,text,text,text,text,text,text)',
  'fn_create_test_result(uuid,uuid,date,text,text,text,numeric,numeric,text,text,uuid,uuid,jsonb,text)',
  'fn_dashboard_summary(uuid,integer)',
  'fn_generate_deadline_notifications(uuid,integer)',
  'fn_generate_due_tests(uuid,date,date)',
  'fn_invite_project_member(uuid,text,text)',
  'fn_link_due_to_result(uuid,uuid)',
  'fn_list_my_projects()',
  'fn_lot_received_create_due_tests(uuid,uuid)',
  'fn_materialize_ppi_pending_tests(uuid)',
  'fn_monthly_kpi_autofill(uuid,date)',
  'fn_next_audit_code(uuid)',
  'fn_next_be_campo_code(uuid,text)',
  'fn_next_compaction_code(uuid)',
  'fn_next_concrete_batch_code(uuid)',
  'fn_next_concrete_lot_code(uuid)',
  'fn_next_gr_code(uuid)',
  'fn_next_hp_notification_code(uuid)',
  'fn_next_lot_code(uuid,text)',
  'fn_next_ppi_code(uuid,text)',
  'fn_next_rmsgq_code(uuid)',
  'fn_next_soil_code(uuid)',
  'fn_next_tech_office_code(uuid,text)',
  'fn_ppi_bulk_mark_ok(uuid)',
  'fn_ppi_bulk_save_items(uuid,jsonb)',
  'fn_ppi_instance_transition(uuid,text)',
  'fn_ppi_instance_transition(uuid,text,text)',
  'fn_project_health_kpis(uuid)',
  'fn_qc_report_summary(uuid,date,date)',
  'fn_recalc_work_item_readiness(uuid)',
  'fn_recompute_material_block(uuid)',
  'fn_remove_project_member(uuid,uuid)',
  'fn_update_lot_status(uuid,text,uuid,text,uuid)',
  'fn_update_member_role(uuid,uuid,text)',
  'fn_update_nc_status(uuid,text)',
  'fn_update_test_status(uuid,text)',
  'fn_waive_due_test(uuid,text)',
  'fn_work_item_report(uuid)',
  'get_project_role(uuid,uuid)',
  'get_user_tenant_id(uuid)',
  'has_project_role(uuid,uuid,text)',
  'has_role(uuid,public.app_role)',
  'is_project_admin(uuid,uuid)',
  'is_project_member(uuid,uuid)',
  'log_audit(uuid,text,uuid,text,jsonb)'
];
fn text;
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', fn);
      EXECUTE format('GRANT  EXECUTE ON FUNCTION public.%s TO authenticated', fn);
    EXCEPTION WHEN others THEN
      -- Ignorar funções que não existem com essa assinatura exacta
      NULL;
    END;
  END LOOP;
END $do$;
