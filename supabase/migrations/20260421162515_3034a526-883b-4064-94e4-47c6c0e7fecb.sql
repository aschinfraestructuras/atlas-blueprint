-- 1) FIELD RECORDS
DELETE FROM field_record_checks WHERE record_id = '026239d8-7198-4476-93f6-eed7e61722c7';
DELETE FROM field_record_materials WHERE record_id = '026239d8-7198-4476-93f6-eed7e61722c7';
DELETE FROM field_records WHERE id = '026239d8-7198-4476-93f6-eed7e61722c7';

-- 2) TOPOGRAFIA
DELETE FROM topography_controls WHERE id = '86b94ac3-fb61-461e-a12f-e3f180d360c7';
DELETE FROM topography_requests WHERE id = 'd514348e-8ddb-44d4-9bdd-f9c45c7e546b';
UPDATE topography_controls SET equipment_id = NULL WHERE equipment_id = '359ad07d-5626-4315-9e6d-f09a9c674d30';
DELETE FROM equipment_calibrations WHERE equipment_id = '359ad07d-5626-4315-9e6d-f09a9c674d30';
DELETE FROM topography_equipment WHERE id = '359ad07d-5626-4315-9e6d-f09a9c674d30';

-- 3) RECEPÇÕES DE MATERIAIS
DELETE FROM material_lots WHERE id IN (
  '00000005-0001-0001-0001-000000000001','00000005-0001-0001-0001-000000000002',
  '00000005-0001-0001-0001-000000000003','00000005-0001-0001-0001-000000000004',
  '00000005-0001-0001-0001-000000000005','00000005-0001-0001-0001-000000000006'
);

-- 4) RECICLADOS
DELETE FROM recycled_material_documents WHERE recycled_material_id = 'ba6cb7ba-72e7-4e93-a129-24db4f81b97c';
DELETE FROM recycled_materials WHERE id = 'ba6cb7ba-72e7-4e93-a129-24db4f81b97c';

-- 5) AUDITORIAS
DELETE FROM quality_audits WHERE id IN (
  'ee000001-0001-0001-0001-000000000001',
  'ee000001-0001-0001-0001-000000000002',
  'ee000001-0001-0001-0001-000000000003'
);

-- 6) PLANEAMENTO — soft-delete via UPDATE (respeita trigger)
UPDATE planning_activities SET is_deleted = true, deleted_at = now()
WHERE id IN (
  'b591d4ca-cde6-49af-a18f-874bbe2a94d2',
  '063fb056-e616-4136-a79e-cef2011bd47d'
);

-- 7) WORK ITEMS antigos soft-deleted (tentativa hard delete; se falhar por trigger, manter como estão)
DO $$
BEGIN
  BEGIN
    DELETE FROM work_items WHERE id IN (
      '106ea550-ad0d-4ef3-9f03-cecb0121f56e',
      '91da4bc9-c36b-4f5d-a808-a265cca7318c',
      '3356907b-33d5-4ad3-b017-85858f5e916e'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'work_items hard-delete bloqueado por trigger; registos continuam arquivados';
  END;
END $$;