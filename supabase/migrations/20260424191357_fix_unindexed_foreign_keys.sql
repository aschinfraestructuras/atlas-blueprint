-- Corrigir as 4 FKs sem índice identificadas pelo advisor
CREATE INDEX IF NOT EXISTS idx_daily_reports_subcontractor_dr
  ON public.daily_reports (subcontractor_id_dr)
  WHERE subcontractor_id_dr IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_machinery_operator_worker
  ON public.project_machinery (operator_worker_id)
  WHERE operator_worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tgc_created_by
  ON public.track_geometry_campaigns (created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tgc_ppi_instance
  ON public.track_geometry_campaigns (ppi_instance_id)
  WHERE ppi_instance_id IS NOT NULL;
