CREATE INDEX IF NOT EXISTS idx_hp_notifications_status
ON public.hp_notifications (project_id, status)
WHERE status IN ('pending', 'confirmed');
