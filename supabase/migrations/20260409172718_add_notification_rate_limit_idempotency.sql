-- Rate limit table
CREATE TABLE IF NOT EXISTS notification_rate_limits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL,
  user_id     uuid NOT NULL,
  window_hour timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  send_count  int NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, window_hour)
);

ALTER TABLE notification_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_own" ON notification_rate_limits
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Idempotência: coluna opcional de chave de idempotência no notifications_log
ALTER TABLE notifications_log
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS rate_limited    boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_log_idempotency_key
  ON notifications_log (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Função RPC atómica de rate limit
CREATE OR REPLACE FUNCTION fn_check_and_increment_rate_limit(
  p_project_id uuid,
  p_user_id    uuid,
  p_max_per_hour int DEFAULT 20
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
  v_window timestamptz := date_trunc('hour', now());
BEGIN
  INSERT INTO notification_rate_limits (project_id, user_id, window_hour, send_count)
  VALUES (p_project_id, p_user_id, v_window, 1)
  ON CONFLICT (project_id, user_id, window_hour)
  DO UPDATE SET
    send_count = notification_rate_limits.send_count + 1,
    updated_at = now()
  RETURNING send_count INTO v_count;

  RETURN v_count <= p_max_per_hour;
END;
$$;
