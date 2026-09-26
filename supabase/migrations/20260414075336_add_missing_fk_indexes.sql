-- 2 foreign keys sem índice reportadas pelo advisor
CREATE INDEX IF NOT EXISTS idx_material_lots_work_item_id
  ON public.material_lots(work_item_id)
  WHERE work_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_reports_deleted_by
  ON public.monthly_quality_reports(deleted_by)
  WHERE deleted_by IS NOT NULL;
