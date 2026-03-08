-- Seed document records for previously uploaded project files (PF17A)
-- Users will attach the actual PDF/Word files via the Documents module UI

INSERT INTO documents (project_id, title, code, doc_type, disciplina, revision, status, version, created_by)
VALUES
  -- V00 - Geral
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_00_01 — Memória Descritiva Geral', 'PE-00-01', 'mdj', 'geral', '00', 'draft', '00', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_00_02 — Índice Geral do Projeto de Execução', 'PE-00-02-IND', 'index', 'geral', '01', 'draft', '01', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_00_02 — Memória Descritiva e Justificativa', 'PE-00-02-MDJ', 'mdj', 'geral', '00', 'draft', '00', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_00_02 — Lista de Desenhos', 'PE-00-02-LD', 'drawing', 'geral', '01', 'draft', '01', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),

  -- V01.01 - Drenagem
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_01_01 — Índice de Drenagem', 'PE-01-01-IND', 'index', 'drenagem', '03', 'draft', '03', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),

  -- V01.02 - Terraplenagem e Via
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_01_02 — Índice de Terraplenagem e Via', 'PE-01-02-IND', 'index', 'terraplenagem', '03', 'draft', '03', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),

  -- V01.04 - Catenária
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_01_04 — Índice de Catenária', 'PE-01-04-IND', 'index', 'catenaria', '02', 'draft', '02', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),

  -- V01.06 - Sinalização Ferroviária
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_01_06 — Índice de Sinalização Ferroviária', 'PE-01-06-IND', 'index', 'sinalizacao', '01', 'draft', '01', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),

  -- V01.07 - Muros de Suporte
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_01_07 — Índice de Muros de Suporte', 'PE-01-07-IND', 'index', 'muros_suporte', '02', 'draft', '02', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),

  -- V01.08 - Geotecnia
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A_PE_01_08 — Índice de Geotecnia', 'PE-01-08-IND', 'index', 'geotecnia', '03', 'draft', '03', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),

  -- Relatório de Interoperabilidade ENE
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PF17A — Relatório de Interoperabilidade ENE (fase PROJ)', 'REL-INTEROP-ENE', 'interoperability_report', 'catenaria', '00', 'draft', '00', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),

  -- PAME (Plano de Aprovação de Materiais e Equipamentos)
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PAME-PF17A-001 — Plano de Aprovação de Materiais e Equipamentos', 'PAME-PF17A-001', 'plan', 'geral', '00', 'approved', '00', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67'),

  -- PE (Plano de Ensaios)
  ('aaaaaaaa-0001-0001-0001-000000000001', 'PE-PF17A-001 — Plano de Ensaios', 'PE-PF17A-001', 'plan', 'geral', '00', 'approved', '00', 'a85d44fb-6f93-4c8c-a7e4-b7b684312e67')

ON CONFLICT DO NOTHING;
