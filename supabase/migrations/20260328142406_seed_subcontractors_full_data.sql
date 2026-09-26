-- ============================================================
-- SUBEMPREITEIROS — actualizar 3 com dados completos reais
-- ============================================================

-- 1. Soldadura Aluminotérmica — Termoweld, Lda
UPDATE public.subcontractors SET
  name = 'Termoweld — Soldadura Ferroviária, Lda',
  trade = 'soldadura',
  status = 'active',
  documentation_status = 'complete',
  contract = 'Contrato de Subempreitada n.º SE-PF17A-003 — Soldadura Aluminotérmica de Carris 60E1, data 2026-01-15',
  contact_name = 'Eng. Ricardo Branco',
  contact_email = 'r.branco@termoweld.pt',
  contact_phone = '+351 912 345 678',
  performance_score = 88.5,
  notes = 'Empresa certificada EN 14730-1. Operadores com certificação UIC 534. Activa no projecto desde Janeiro 2026. Sem ocorrências relevantes.'
WHERE id = '465b8965-187a-4cd8-b103-8feba062e29d';

-- 2. Via Férrea — Railworks Portugal, SA
UPDATE public.subcontractors SET
  name = 'Railworks Portugal, SA',
  trade = 'via_ferrea',
  status = 'active',
  documentation_status = 'partial',
  contract = 'Contrato de Subempreitada n.º SE-PF17A-001 — Montagem e Alinhamento de Via, data 2025-12-01',
  contact_name = 'Eng. Ana Ferreira',
  contact_email = 'ana.ferreira@railworks.pt',
  contact_phone = '+351 934 567 890',
  performance_score = 74.0,
  notes = 'Documentação de qualificação do pessoal em falta — CRFP pendente de 3 operadores. Aguardar resolução antes de avançar para troço T4.'
WHERE id = 'c2149900-6008-43d9-9b5e-ed65e181916f';

-- 3. Catenária — ElecoRail, Unipessoal
UPDATE public.subcontractors SET
  name = 'ElecoRail — Catenária e OCS, Unipessoal',
  trade = 'catenaria',
  status = 'active',
  documentation_status = 'pending',
  contract = 'Contrato de Subempreitada n.º SE-PF17A-005 — Montagem de Catenária 25kV AC, data 2026-02-20',
  contact_name = 'Eng. Paulo Neves',
  contact_email = 'paulo.neves@elecoRail.pt',
  contact_phone = '+351 968 123 456',
  performance_score = NULL,
  notes = 'Início previsto para Maio 2026. Documentação de habilitações e seguros a entregar até 30 Abril 2026.'
WHERE id = 'e7247977-69b7-4c42-9762-176118a0df4e';

-- ============================================================
-- TRABALHADORES dos subempreiteiros
-- ============================================================
INSERT INTO public.project_workers (id, project_id, subcontractor_id, name, role_function, company, worker_number, status, has_safety_training, notes)
VALUES
  -- Termoweld
  ('b1000001-2000-2000-2000-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001',
   '465b8965-187a-4cd8-b103-8feba062e29d',
   'José Manuel Rodrigues', 'Soldador Aluminotérmico Certificado', 'Termoweld, Lda',
   'TW-2026-001', 'active', true,
   'Cert. EN 14730-1 válida até 2027-06. Operador desde 2018. 340+ soldaduras executadas.'),
  ('b1000001-2000-2000-2000-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001',
   '465b8965-187a-4cd8-b103-8feba062e29d',
   'André Sousa Lima', 'Soldador Aluminotérmico', 'Termoweld, Lda',
   'TW-2026-002', 'active', true,
   'Cert. EN 14730-1 válida até 2026-11. Formação de renovação agendada para Outubro.'),
  ('b1000001-2000-2000-2000-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001',
   '465b8965-187a-4cd8-b103-8feba062e29d',
   'Miguel Costa Pinto', 'Auxiliar de Soldadura / Ensaios US', 'Termoweld, Lda',
   'TW-2026-003', 'active', true,
   'Técnico de END nível 2 (US). Responsável pelos ensaios ultrassónicos pós-soldadura.'),

  -- Railworks
  ('b1000001-2000-2000-2000-000000000004', 'aaaaaaaa-0001-0001-0001-000000000001',
   'c2149900-6008-43d9-9b5e-ed65e181916f',
   'Carlos Alberto Moura', 'Chefe de Equipa Via', 'Railworks Portugal, SA',
   'RW-2026-001', 'active', true,
   'CRFP válido. 15 anos experiência em via-férrea. Responsável técnico da equipa.'),
  ('b1000001-2000-2000-2000-000000000005', 'aaaaaaaa-0001-0001-0001-000000000001',
   'c2149900-6008-43d9-9b5e-ed65e181916f',
   'Rui Filipe Carvalho', 'Operador Máquina Balizagem', 'Railworks Portugal, SA',
   'RW-2026-002', 'active', true,
   'CRFP válido. Operador de estabilizador e balizadora.'),
  ('b1000001-2000-2000-2000-000000000006', 'aaaaaaaa-0001-0001-0001-000000000001',
   'c2149900-6008-43d9-9b5e-ed65e181916f',
   'Tiago Nascimento Silva', 'Assentador de Via', 'Railworks Portugal, SA',
   'RW-2026-003', 'inactive', false,
   'CRFP PENDENTE — entrada em obra suspensa até regularização.'),

  -- ElecoRail
  ('b1000001-2000-2000-2000-000000000007', 'aaaaaaaa-0001-0001-0001-000000000001',
   'e7247977-69b7-4c42-9762-176118a0df4e',
   'Pedro Augusto Lemos', 'Eng. Responsável Catenária', 'ElecoRail, Unipessoal',
   'ER-2026-001', 'active', false,
   'Documentação em curso. Início obra Maio 2026.');
