-- ════════════════════════════════════════════════════════════════════
-- 1. FUNÇÕES DE TRIGGER — revogar de anon E authenticated
--    São chamadas internamente por triggers, nunca via RPC directa.
-- ════════════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn()                    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_audit_trigger()                    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ppi_set_updated_at()                  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_tc_updated_at()                    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_risk_updated_at()                  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_ppi_materialize_tests_on_start()   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_propagate_material_block_doc()     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_propagate_material_block_nc()      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_propagate_material_block_test()    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_block_activity_completion()       FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_notify_hp_missing()            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_recalc_readiness()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_training_signed_update_worker() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_validate_dfo_item_status()        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_validate_hp_notification_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_validate_ppi_item_check()         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_validate_test_approval()          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_add_creator_as_project_admin()     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_block_unreleased_lot()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_equipment_calibration()      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_subcontractor_docs()         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_update_equipment_calibration_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.storage_path_project_id(text)         FROM anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 2. FUNÇÕES DE NEGÓCIO — revogar apenas de anon
--    Utilizadores autenticados precisam de as chamar normalmente.
--    Utilizadores anónimos nunca devem ter acesso.
-- ════════════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.fn_accept_project_invite(text)        FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_bulk_export_tests(uuid, uuid[])    FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_activity_completion(uuid)    FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_and_increment_rate_limit(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_claim_my_pending_invites()         FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_complete_due_from_result(uuid, uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_document(uuid, text, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_material(uuid, text, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_nc_from_ppi_item(uuid, text, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_nc_from_test(uuid, text, text, date)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_new_version(uuid, text, text, bigint, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_ppi_instance(uuid, uuid, uuid, text, uuid, uuid, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_reception_nc(uuid)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_supplier(uuid, text, text, text, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_test_result(uuid, uuid, date, text, text, text, numeric, numeric, text, text, uuid, uuid, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_dashboard_summary(uuid, integer)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_generate_deadline_notifications(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_generate_due_tests(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_invite_project_member(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_link_due_to_result(uuid, uuid)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_my_projects()                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_lot_received_create_due_tests(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_materialize_ppi_pending_tests(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_monthly_kpi_autofill(uuid, date)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_audit_code(uuid)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_be_campo_code(uuid, text)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_compaction_code(uuid)         FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_concrete_batch_code(uuid)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_concrete_lot_code(uuid)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_gr_code(uuid)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_hp_notification_code(uuid)    FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_lot_code(uuid, text)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_ppi_code(uuid, text)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_rmsgq_code(uuid)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_soil_code(uuid)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_next_tech_office_code(uuid, text)  FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_ppi_bulk_mark_ok(uuid)             FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_ppi_bulk_save_items(uuid, jsonb)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_ppi_instance_transition(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_ppi_instance_transition(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_project_health_kpis(uuid)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_qc_report_summary(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_recalc_work_item_readiness(uuid)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_recompute_material_block(uuid)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_remove_project_member(uuid, uuid)  FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_risk_code()                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_technical_change_code()        FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_lot_status(uuid, text, uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_member_role(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_nc_status(uuid, text)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_test_status(uuid, text)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_waive_due_test(uuid, text)         FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_work_item_report(uuid)             FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_role(uuid, uuid)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text)    FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_admin(uuid, uuid)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid, uuid)         FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit(uuid, text, uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_activity_completion(uuid)    FROM anon;
