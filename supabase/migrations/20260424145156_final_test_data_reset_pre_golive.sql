-- ════════════════════════════════════════════════════════════════════
-- LIMPEZA FINAL PRÉ-ARRANQUE DE OBRA — 24 Abril 2026
-- ════════════════════════════════════════════════════════════════════

-- Desactivar triggers custom com nomes correctos
ALTER TABLE subcontractors      DISABLE TRIGGER trg_sub_audit;
ALTER TABLE subcontractors      DISABLE TRIGGER trg_sub_updated_at;
ALTER TABLE suppliers           DISABLE TRIGGER audit_suppliers;
ALTER TABLE suppliers           DISABLE TRIGGER trg_suppliers_updated_at;
ALTER TABLE project_workers     DISABLE TRIGGER set_project_workers_updated_at;
ALTER TABLE planning_activities DISABLE TRIGGER trg_activity_code;
ALTER TABLE planning_activities DISABLE TRIGGER trg_activity_completion_check;
ALTER TABLE planning_activities DISABLE TRIGGER trg_check_sub_docs_on_activity;
ALTER TABLE planning_activities DISABLE TRIGGER trg_prevent_hard_delete_activities;

-- 1. Subcontratados e fornecedores de teste
UPDATE subcontractors SET is_deleted=true, deleted_at=NOW() WHERE is_deleted=false;
UPDATE suppliers       SET is_deleted=true, deleted_at=NOW() WHERE is_deleted=false;

-- 2. Trabalhadores e qualificações de teste
DELETE FROM worker_qualifications WHERE project_id='aaaaaaaa-0001-0001-0001-000000000001';
DELETE FROM project_workers       WHERE project_id='aaaaaaaa-0001-0001-0001-000000000001';

-- 3. Registos de campo e partes diárias de teste
UPDATE field_records SET is_deleted=true WHERE is_deleted=false;
UPDATE daily_reports SET is_deleted=true WHERE is_deleted=false;

-- 4. Actividades de planeamento de teste (WBS mantém-se intacto)
UPDATE planning_activities
SET is_deleted=true
WHERE project_id='aaaaaaaa-0001-0001-0001-000000000001'
  AND (is_deleted=false OR is_deleted IS NULL);

-- 5. Relatórios mensais SGQ de teste (pré-obra)
DELETE FROM monthly_quality_reports
WHERE project_id='aaaaaaaa-0001-0001-0001-000000000001';

-- 6. Documentos de subcontratados/fornecedores de teste
DELETE FROM subcontractor_documents
WHERE subcontractor_id IN (
  SELECT id FROM subcontractors
  WHERE project_id='aaaaaaaa-0001-0001-0001-000000000001'
);
DELETE FROM supplier_documents
WHERE supplier_id IN (
  SELECT id FROM suppliers
  WHERE project_id='aaaaaaaa-0001-0001-0001-000000000001'
);

-- Reactivar triggers
ALTER TABLE subcontractors      ENABLE TRIGGER trg_sub_audit;
ALTER TABLE subcontractors      ENABLE TRIGGER trg_sub_updated_at;
ALTER TABLE suppliers           ENABLE TRIGGER audit_suppliers;
ALTER TABLE suppliers           ENABLE TRIGGER trg_suppliers_updated_at;
ALTER TABLE project_workers     ENABLE TRIGGER set_project_workers_updated_at;
ALTER TABLE planning_activities ENABLE TRIGGER trg_activity_code;
ALTER TABLE planning_activities ENABLE TRIGGER trg_activity_completion_check;
ALTER TABLE planning_activities ENABLE TRIGGER trg_check_sub_docs_on_activity;
ALTER TABLE planning_activities ENABLE TRIGGER trg_prevent_hard_delete_activities;
