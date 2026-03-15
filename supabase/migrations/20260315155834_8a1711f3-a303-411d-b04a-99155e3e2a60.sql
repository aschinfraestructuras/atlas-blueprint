
-- ─── hp_notifications table ───────────────────────────────────────────────────
CREATE TABLE public.hp_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  instance_id     uuid NOT NULL REFERENCES public.ppi_instances(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES public.ppi_instance_items(id) ON DELETE SET NULL,
  code            text NOT NULL,
  ppi_ref         text NOT NULL,
  point_no        text NOT NULL,
  activity        text NOT NULL,
  location_pk     text,
  planned_datetime timestamptz NOT NULL,
  notified_at     timestamptz NOT NULL DEFAULT now(),
  notified_by     uuid REFERENCES auth.users(id),
  confirmed_at    timestamptz,
  confirmed_by    text,
  status          text NOT NULL DEFAULT 'pending',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.trg_validate_hp_notification_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed', 'expired', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid hp_notification status: %', NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_hp_notification_status_check
  BEFORE INSERT OR UPDATE ON public.hp_notifications
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_hp_notification_status();

ALTER TABLE public.hp_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can manage hp_notifications"
  ON public.hp_notifications
  FOR ALL
  USING (public.is_project_member(auth.uid(), project_id));

CREATE INDEX idx_hp_notifications_instance ON public.hp_notifications(instance_id);
CREATE INDEX idx_hp_notifications_project ON public.hp_notifications(project_id);
CREATE INDEX idx_hp_notifications_planned ON public.hp_notifications(planned_datetime);

-- Auto-incrementing code generator function
CREATE OR REPLACE FUNCTION public.fn_next_hp_notification_code(p_project_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_seq int;
BEGIN
  SELECT coalesce(max(cast(nullif(regexp_replace(code,'[^0-9]','','g'),'') as int)),0)+1
  INTO v_seq FROM public.hp_notifications WHERE project_id = p_project_id;
  RETURN 'NOT-HP-' || lpad(v_seq::text, 3, '0');
END; $$;
