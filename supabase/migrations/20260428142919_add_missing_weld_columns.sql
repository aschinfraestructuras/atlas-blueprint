-- Adicionar colunas que o formulário WeldPage usa mas não existem na BD
ALTER TABLE public.weld_records
  ADD COLUMN IF NOT EXISTS bloco_calibracao_ref   text,
  ADD COLUMN IF NOT EXISTS pk_end                 text,
  ADD COLUMN IF NOT EXISTS operator_cert_expiry   date,
  ADD COLUMN IF NOT EXISTS is_deleted             boolean DEFAULT false;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
