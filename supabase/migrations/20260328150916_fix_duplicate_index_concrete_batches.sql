-- Remover índice duplicado (existe idx_concrete_batch_date_project que faz o mesmo)
DROP INDEX IF EXISTS public.idx_concrete_batches_date;
