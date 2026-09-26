-- Soft delete
ALTER TABLE hp_notifications
  ADD COLUMN IF NOT EXISTS is_deleted  boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_voided   boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at   timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by   uuid        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason text;

-- Unicidade de código só em registos activos (não eliminados nem anulados)
CREATE UNIQUE INDEX IF NOT EXISTS hp_notifications_project_code_active_unique
  ON hp_notifications (project_id, code)
  WHERE is_deleted IS NOT TRUE AND is_voided IS NOT TRUE;
