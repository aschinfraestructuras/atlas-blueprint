-- [3] Soft delete NCs de teste
UPDATE public.non_conformities
SET is_deleted = true,
    deleted_at = now(),
    deleted_by = '4d4bd489-7cbd-449e-af76-d10ab456d6a3'
WHERE project_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND (code LIKE '%TESTE%' OR code LIKE '%VAR%')
  AND is_deleted = false;

-- [5] Soft delete documentos duplicados (só tem is_deleted, sem deleted_at)
UPDATE public.documents
SET is_deleted = true
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY title, project_id
        ORDER BY created_at ASC
      ) as rn
    FROM public.documents
    WHERE project_id = 'aaaaaaaa-0001-0001-0001-000000000001'
      AND is_deleted = false
  ) ranked
  WHERE rn > 1
);

-- [7] Localização ferroviária em ppi_instances
ALTER TABLE public.ppi_instances
  ADD COLUMN IF NOT EXISTS pk_inicio   text,
  ADD COLUMN IF NOT EXISTS pk_fim      text,
  ADD COLUMN IF NOT EXISTS zone        text,
  ADD COLUMN IF NOT EXISTS element_ref text;
