-- Remover constraint antiga e criar nova que inclui submitted e reviewed
ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_status_check;

ALTER TABLE test_results ADD CONSTRAINT test_results_status_check
  CHECK (status = ANY (ARRAY[
    'draft', 'in_progress', 'submitted', 'reviewed',
    'completed', 'approved', 'archived',
    'pending', 'pass', 'fail', 'inconclusive'
  ]));
