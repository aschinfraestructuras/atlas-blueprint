-- Apagar definitivamente o NC-PF17A-2026-0001 de teste (is_deleted=true, criado em Março)
DELETE FROM non_conformities 
WHERE code = 'NC-PF17A-2026-0001' AND is_deleted = true;

-- Renomear NC-PF17A-2026-0002 para NC-PF17A-2026-0001
UPDATE non_conformities 
SET code = 'NC-PF17A-2026-0001', nc_sequence = 1
WHERE code = 'NC-PF17A-2026-0002' AND is_deleted = false;
