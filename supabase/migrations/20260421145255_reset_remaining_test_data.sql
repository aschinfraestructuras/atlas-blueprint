-- Desactivar triggers custom por nome
ALTER TABLE subcontractors    DISABLE TRIGGER trg_sub_audit;
ALTER TABLE subcontractors    DISABLE TRIGGER trg_sub_updated_at;
ALTER TABLE laboratories      DISABLE TRIGGER set_laboratories_updated_at;
ALTER TABLE rfis               DISABLE TRIGGER set_rfis_updated_at;
ALTER TABLE rfis               DISABLE TRIGGER trg_rfi_auto_fields;
ALTER TABLE rfis               DISABLE TRIGGER trg_rfi_code;
ALTER TABLE training_sessions  DISABLE TRIGGER trg_validate_session_type;
ALTER TABLE training_attendees DISABLE TRIGGER trg_training_attendee_signed;
ALTER TABLE work_items         DISABLE TRIGGER trg_work_items_updated_at;

-- 1. Subcontratados (soft delete)
UPDATE subcontractors SET is_deleted = true, deleted_at = NOW() WHERE is_deleted = false;

-- 2. Laboratórios (soft delete)
UPDATE laboratories SET is_deleted = true, deleted_at = NOW() WHERE is_deleted = false;

-- 3. RFIs (soft delete)
UPDATE rfis SET is_deleted = true, deleted_at = NOW() WHERE is_deleted = false;

-- 4. Formações (hard delete — sem is_deleted)
DELETE FROM training_attendees;
DELETE FROM training_sessions;

-- 5. Work items de projectos inválidos (projectos que não existem)
UPDATE work_items SET is_deleted = true, deleted_at = NOW()
WHERE is_deleted = false
  AND project_id NOT IN (SELECT id FROM projects);

-- Reactivar triggers
ALTER TABLE subcontractors    ENABLE TRIGGER trg_sub_audit;
ALTER TABLE subcontractors    ENABLE TRIGGER trg_sub_updated_at;
ALTER TABLE laboratories      ENABLE TRIGGER set_laboratories_updated_at;
ALTER TABLE rfis               ENABLE TRIGGER set_rfis_updated_at;
ALTER TABLE rfis               ENABLE TRIGGER trg_rfi_auto_fields;
ALTER TABLE rfis               ENABLE TRIGGER trg_rfi_code;
ALTER TABLE training_sessions  ENABLE TRIGGER trg_validate_session_type;
ALTER TABLE training_attendees ENABLE TRIGGER trg_training_attendee_signed;
ALTER TABLE work_items         ENABLE TRIGGER trg_work_items_updated_at;
