-- PART 2: Training Sessions
CREATE TABLE public.training_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code          text NOT NULL,
  session_date  date NOT NULL DEFAULT CURRENT_DATE,
  session_type  text NOT NULL DEFAULT 'initial',
  title         text NOT NULL,
  location      text,
  start_time    text,
  end_time      text,
  trainer_name  text,
  topics        text,
  attendee_count int NOT NULL DEFAULT 0,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.training_attendees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  name            text NOT NULL,
  role_function   text,
  company         text,
  signed          boolean NOT NULL DEFAULT false
);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members access training_sessions"
  ON public.training_sessions FOR ALL
  USING (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()));

CREATE POLICY "project members access training_attendees"
  ON public.training_attendees FOR ALL
  USING (session_id IN (SELECT ts.id FROM public.training_sessions ts WHERE ts.project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid())));

CREATE INDEX idx_training_sessions_project ON public.training_sessions(project_id);
CREATE INDEX idx_training_attendees_session ON public.training_attendees(session_id);

-- Validation trigger for session_type
CREATE OR REPLACE FUNCTION public.fn_validate_session_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.session_type NOT IN ('initial','new_personnel','specific','subcontractor','other') THEN
    RAISE EXCEPTION 'Invalid session_type: %', NEW.session_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_session_type
  BEFORE INSERT OR UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_session_type();

CREATE OR REPLACE FUNCTION public.fn_next_training_code(p_project_id uuid)
RETURNS text LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_seq int;
BEGIN
  SELECT coalesce(max(cast(regexp_replace(ts.code,'[^0-9]','','g') as int)),0)+1
  INTO v_seq FROM public.training_sessions ts WHERE ts.project_id = p_project_id;
  RETURN 'RF-PF17A-' || lpad(v_seq::text, 3, '0');
END; $$;

-- PART 3: FAV columns on materials
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS technical_comparison jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS fav_documents jsonb DEFAULT '[]'::jsonb;