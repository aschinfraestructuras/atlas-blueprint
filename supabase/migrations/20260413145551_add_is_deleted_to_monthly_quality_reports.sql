-- Adicionar soft-delete a monthly_quality_reports (consistente com o resto do schema)
ALTER TABLE public.monthly_quality_reports
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- Índice para excluir registos apagados nas queries habituais
CREATE INDEX IF NOT EXISTS idx_monthly_reports_not_deleted
  ON public.monthly_quality_reports (project_id)
  WHERE is_deleted = false;

-- Actualizar a listagem para excluir soft-deleted (RLS não filtra isto)
-- O filtro é feito no serviço, mas garantimos que a view também não os inclui;
