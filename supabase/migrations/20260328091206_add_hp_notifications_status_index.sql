-- Índice para queries de HPs por status (Prazos, Dashboard, My Tasks)
CREATE INDEX IF NOT EXISTS idx_hp_notifications_status 
ON public.hp_notifications (project_id, status)
WHERE status IN ('pending', 'confirmed');

-- Índice para weld_records por resultado (soldaduras pendentes US)
CREATE INDEX IF NOT EXISTS idx_weld_records_pending_ut
ON public.weld_records (project_id, overall_result)
WHERE has_ut = false AND overall_result = 'pending';

-- Índice para soil_samples por resultado
CREATE INDEX IF NOT EXISTS idx_soil_samples_result
ON public.soil_samples (project_id, overall_result);

-- Índice para concrete_specimens sem resultado mas com data de ensaio passada
CREATE INDEX IF NOT EXISTS idx_concrete_specimens_overdue
ON public.concrete_specimens (batch_id, mold_date)
WHERE break_load_kn IS NULL;
