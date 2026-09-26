-- Remove o constraint antigo que não exclui registos eliminados
ALTER TABLE ppi_instances DROP CONSTRAINT IF EXISTS ppi_instances_project_code_unique;

-- Cria índice único parcial: só aplica a registos NÃO eliminados
CREATE UNIQUE INDEX ppi_instances_project_code_active_unique
  ON ppi_instances (project_id, code)
  WHERE is_deleted IS NOT TRUE;
