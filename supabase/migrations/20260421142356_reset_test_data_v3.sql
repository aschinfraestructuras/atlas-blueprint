-- ══════════════════════════════════════════════════════════════════
-- RESET DADOS DE TESTE — desactivar só triggers custom por nome
-- ══════════════════════════════════════════════════════════════════

-- test_results
ALTER TABLE test_results DISABLE TRIGGER audit_test_results;
ALTER TABLE test_results DISABLE TRIGGER trg_propagate_material_block_test;
ALTER TABLE test_results DISABLE TRIGGER trg_test_results_recalc_readiness;
ALTER TABLE test_results DISABLE TRIGGER trg_test_results_updated_at;
ALTER TABLE test_results DISABLE TRIGGER trg_validate_test_approval;

-- non_conformities
ALTER TABLE non_conformities DISABLE TRIGGER trg_nc_auto_fields;
ALTER TABLE non_conformities DISABLE TRIGGER trg_nc_recalc_readiness;
ALTER TABLE non_conformities DISABLE TRIGGER trg_propagate_material_block_nc;
ALTER TABLE non_conformities DISABLE TRIGGER update_non_conformities_updated_at;

-- ppi_instances
ALTER TABLE ppi_instances DISABLE TRIGGER trg_ppi_approved_check_hp;
ALTER TABLE ppi_instances DISABLE TRIGGER trg_ppi_instances_updated_at;
ALTER TABLE ppi_instances DISABLE TRIGGER trg_ppi_materialize_tests_on_start;
ALTER TABLE ppi_instances DISABLE TRIGGER trg_ppi_recalc_readiness;

-- ppi_instance_items
ALTER TABLE ppi_instance_items DISABLE TRIGGER trg_validate_ppi_item_check;

-- suppliers
ALTER TABLE suppliers DISABLE TRIGGER audit_suppliers;
ALTER TABLE suppliers DISABLE TRIGGER trg_suppliers_updated_at;

-- documents
ALTER TABLE documents DISABLE TRIGGER audit_documents;
ALTER TABLE documents DISABLE TRIGGER trg_documents_updated_at;

-- field_records
ALTER TABLE field_records DISABLE TRIGGER trg_validate_field_record;
ALTER TABLE field_records DISABLE TRIGGER update_field_records_updated_at;

-- ── LIMPEZA ───────────────────────────────────────────────────────

-- 1. Notificações sistema
DELETE FROM notification_recipients;
DELETE FROM notifications_log;
DELETE FROM notifications;

-- 2. HP Notifications
DELETE FROM hp_notifications;

-- 3. Ensaios realizados
UPDATE test_results SET is_deleted = true, deleted_at = NOW()
WHERE is_deleted = false;

-- 4. Não Conformidades (todos projectos — todos são teste)
UPDATE non_conformities SET is_deleted = true, deleted_at = NOW()
WHERE is_deleted = false;

-- 5. Registos de campo e Partes diárias
UPDATE field_records SET is_deleted = true WHERE is_deleted = false;
UPDATE daily_reports SET is_deleted = true WHERE is_deleted = false;

-- 6. Itens PPI (hard delete)
DELETE FROM ppi_instance_items;

-- 7. PPIs instanciados
UPDATE ppi_instances SET is_deleted = true, deleted_at = NOW()
WHERE is_deleted = false;

-- 8. Fornecedores e laboratórios (todos de teste)
UPDATE suppliers SET is_deleted = true, deleted_at = NOW()
WHERE is_deleted = false;

-- 9. Documentos de teste (U188, T-001, procedimentos sem código)
UPDATE documents SET is_deleted = true
WHERE is_deleted = false
  AND (
    code ILIKE 'DOC-U188-%'
    OR code ILIKE 'DOC-T-001-%'
    OR (code IS NULL AND doc_type = 'procedure')
  );

-- ── REACTIVAR TRIGGERS ────────────────────────────────────────────
ALTER TABLE test_results ENABLE TRIGGER audit_test_results;
ALTER TABLE test_results ENABLE TRIGGER trg_propagate_material_block_test;
ALTER TABLE test_results ENABLE TRIGGER trg_test_results_recalc_readiness;
ALTER TABLE test_results ENABLE TRIGGER trg_test_results_updated_at;
ALTER TABLE test_results ENABLE TRIGGER trg_validate_test_approval;

ALTER TABLE non_conformities ENABLE TRIGGER trg_nc_auto_fields;
ALTER TABLE non_conformities ENABLE TRIGGER trg_nc_recalc_readiness;
ALTER TABLE non_conformities ENABLE TRIGGER trg_propagate_material_block_nc;
ALTER TABLE non_conformities ENABLE TRIGGER update_non_conformities_updated_at;

ALTER TABLE ppi_instances ENABLE TRIGGER trg_ppi_approved_check_hp;
ALTER TABLE ppi_instances ENABLE TRIGGER trg_ppi_instances_updated_at;
ALTER TABLE ppi_instances ENABLE TRIGGER trg_ppi_materialize_tests_on_start;
ALTER TABLE ppi_instances ENABLE TRIGGER trg_ppi_recalc_readiness;

ALTER TABLE ppi_instance_items ENABLE TRIGGER trg_validate_ppi_item_check;

ALTER TABLE suppliers ENABLE TRIGGER audit_suppliers;
ALTER TABLE suppliers ENABLE TRIGGER trg_suppliers_updated_at;

ALTER TABLE documents ENABLE TRIGGER audit_documents;
ALTER TABLE documents ENABLE TRIGGER trg_documents_updated_at;

ALTER TABLE field_records ENABLE TRIGGER trg_validate_field_record;
ALTER TABLE field_records ENABLE TRIGGER update_field_records_updated_at;
