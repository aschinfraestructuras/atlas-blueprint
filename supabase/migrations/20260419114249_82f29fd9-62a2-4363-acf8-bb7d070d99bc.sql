-- Remover campos redundantes (já existem test_result_id, ppi_instance_item_id, work_item_id)
DROP INDEX IF EXISTS public.idx_nc_source_test_result;
DROP INDEX IF EXISTS public.idx_nc_source_ppi_item;

ALTER TABLE public.non_conformities
  DROP COLUMN IF EXISTS source_test_result_id,
  DROP COLUMN IF EXISTS source_ppi_item_id;