-- 1. APAGAR resultados de ensaios seed (archived + resultado vazio = seed)
--    O utilizador apagou na UI mas ficaram com is_deleted=false
UPDATE public.test_results
SET is_deleted = true,
    deleted_at = now()
WHERE project_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND status = 'archived'
  AND result = '{}'::jsonb
  AND code IS NULL;

-- 2. APAGAR ensaios agendados seed restantes (Proctor e Compactação seed)
UPDATE public.test_due_items
SET is_deleted = true,
    deleted_at = now()
WHERE project_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND is_deleted = false;

-- 3. CORRIGIR PPI duplicados — desactivar os problemáticos
-- PPI-DRN-PIPE e PPI-EST-FOUND são genéricos, não PF17A — desactivar
UPDATE public.ppi_templates
SET is_active = false
WHERE code IN ('PPI-DRN-PIPE', 'PPI-EST-FOUND');

-- PPI-PF17A-02 tem 2 versões com títulos diferentes — manter a de drenagem (é o correcto)
-- e desactivar a que está mal codificada (betao = PPI-PF17A-11)
UPDATE public.ppi_templates
SET is_active = false
WHERE code = 'PPI-PF17A-02'
  AND disciplina = 'betao';

-- PPI-PF17A-03 tem 2 versões — manter a mais completa (com AMV e Soldadura)
-- desactivar a versão incompleta
UPDATE public.ppi_templates
SET is_active = false
WHERE code = 'PPI-PF17A-03'
  AND title NOT LIKE '%AMV%Soldadura%';

-- PPI-PF17A-11-COPY — eliminar a cópia
UPDATE public.ppi_templates
SET is_active = false
WHERE code = 'PPI-PF17A-11-COPY';

-- 4. CORRIGIR catálogo de ensaios seed (ENS-*) — disciplina errada
UPDATE public.tests_catalog
SET disciplina = 'betao'
WHERE code = 'ENS-BET-001'
  AND project_id = 'aaaaaaaa-0001-0001-0001-000000000001';

UPDATE public.tests_catalog
SET disciplina = 'terras'
WHERE code IN ('ENS-COMP-001', 'ENS-SOLO-001')
  AND project_id = 'aaaaaaaa-0001-0001-0001-000000000001';
