-- ══════════════════════════════════════════════════════════════════════════
-- 1. ACTAS DE REUNIÃO SGQ
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sgq_meetings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code            text NOT NULL DEFAULT '',
  meeting_type    text NOT NULL DEFAULT 'monthly'
                  CHECK (meeting_type IN ('kickoff','monthly','hp','audit','extraordinary','closure')),
  meeting_date    date NOT NULL,
  location        text,
  duration_min    integer,
  chairman        text,
  attendees       jsonb DEFAULT '[]',
  agenda          text,
  decisions       text,
  action_points   jsonb DEFAULT '[]',
  next_meeting    date,
  notes           text,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','approved','distributed')),
  created_by      uuid REFERENCES auth.users(id),
  approved_by     uuid REFERENCES auth.users(id),
  approved_at     timestamptz,
  is_deleted      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sgq_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sgq_meetings_all ON public.sgq_meetings;
CREATE POLICY sgq_meetings_all ON public.sgq_meetings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = sgq_meetings.project_id
      AND pm.user_id = (SELECT auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_sgq_meetings_project ON public.sgq_meetings(project_id, meeting_date DESC);

-- ══════════════════════════════════════════════════════════════════════════
-- 2. DIÁRIO DE MÁQUINA
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.machinery_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  machinery_id    uuid REFERENCES public.project_machinery(id) ON DELETE SET NULL,
  log_date        date NOT NULL,
  status          text NOT NULL DEFAULT 'operational'
                  CHECK (status IN ('operational','breakdown','maintenance','standby','transferred')),
  hours_start     numeric(6,2),
  hours_end       numeric(6,2),
  hours_worked    numeric(6,2) GENERATED ALWAYS AS (
                    CASE WHEN hours_end IS NOT NULL AND hours_start IS NOT NULL
                    THEN hours_end - hours_start ELSE NULL END
                  ) STORED,
  location_zone   text,
  work_type       text,
  work_item_id    uuid REFERENCES public.work_items(id) ON DELETE SET NULL,
  breakdown_desc  text,
  repair_desc     text,
  repair_hours    numeric(5,2),
  fuel_liters     numeric(8,2),
  operator_name   text,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  is_deleted      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.machinery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS machinery_log_all ON public.machinery_log;
CREATE POLICY machinery_log_all ON public.machinery_log FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = machinery_log.project_id
      AND pm.user_id = (SELECT auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_machinery_log_project ON public.machinery_log(project_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_machinery_log_machine ON public.machinery_log(machinery_id, log_date DESC);

-- Triggers updated_at usando a função que existe
CREATE TRIGGER trg_sgq_meetings_updated_at
  BEFORE UPDATE ON public.sgq_meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_machinery_log_updated_at
  BEFORE UPDATE ON public.machinery_log
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Numeração automática de actas
CREATE OR REPLACE FUNCTION public.fn_sgq_meeting_code()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_seq integer;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN code ~ '\d+$'
      THEN (regexp_match(code, '(\d+)$'))[1]::integer
      ELSE 0 END
    ), 0) + 1
    INTO v_seq
    FROM public.sgq_meetings
    WHERE project_id = NEW.project_id AND is_deleted = false;
    NEW.code := 'ATA-Q-PF17A-' || LPAD(v_seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sgq_meeting_code
  BEFORE INSERT ON public.sgq_meetings
  FOR EACH ROW EXECUTE FUNCTION public.fn_sgq_meeting_code();

REVOKE EXECUTE ON FUNCTION public.fn_sgq_meeting_code() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
