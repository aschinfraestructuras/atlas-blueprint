-- Corrigir as 2 funções com search_path mutável
-- (vulnerabilidade: sem SET search_path, uma função maliciosa pode substituir schemas)

CREATE OR REPLACE FUNCTION public.fn_block_unreleased_lot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lot_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.material_lots
    WHERE id = NEW.lot_id
      AND reception_status = 'approved'
      AND (is_deleted = false OR is_deleted IS NULL)
  ) THEN
    RAISE EXCEPTION 'Lote não libertado: só lotes com estado "approved" podem ser consumidos em obra. Verifique o estado do lote antes de registar.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_check_and_increment_rate_limit(
  p_project_id uuid,
  p_user_id    uuid,
  p_max_per_hour int DEFAULT 20
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
  v_window timestamptz := date_trunc('hour', now());
BEGIN
  INSERT INTO public.notification_rate_limits (project_id, user_id, window_hour, send_count)
  VALUES (p_project_id, p_user_id, v_window, 1)
  ON CONFLICT (project_id, user_id, window_hour)
  DO UPDATE SET
    send_count = public.notification_rate_limits.send_count + 1,
    updated_at = now()
  RETURNING send_count INTO v_count;

  RETURN v_count <= p_max_per_hour;
END;
$$;
