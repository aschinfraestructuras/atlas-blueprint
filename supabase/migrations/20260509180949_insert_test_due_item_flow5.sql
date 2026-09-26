INSERT INTO test_due_items (
  project_id, plan_rule_id, due_reason, status,
  due_at_date, scheduled_for, is_deleted
) VALUES (
  'aaaaaaaa-0001-0001-0001-000000000001',
  '52c3a962-4ffe-4d5a-9a6f-84142443a4d4',
  'manual_test',
  'in_progress',
  CURRENT_DATE, CURRENT_DATE,
  false
);
