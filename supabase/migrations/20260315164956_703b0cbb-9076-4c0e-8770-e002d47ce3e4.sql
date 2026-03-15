-- PART 1: Quality Audits table
CREATE TABLE public.quality_audits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code            text NOT NULL,
  audit_type      text NOT NULL DEFAULT 'internal',
  status          text NOT NULL DEFAULT 'planned',
  planned_date    date NOT NULL,
  completed_date  date,
  auditor_name    text,
  scope           text,
  findings        text,
  observations    text,
  nc_count        int NOT NULL DEFAULT 0,
  obs_count       int NOT NULL DEFAULT 0,
  report_ref      text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quality_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members access quality_audits"
  ON public.quality_audits FOR ALL
  USING (project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  ));

CREATE INDEX idx_quality_audits_project ON public.quality_audits(project_id);
CREATE INDEX idx_quality_audits_date ON public.quality_audits(project_id, planned_date DESC);

CREATE OR REPLACE FUNCTION public.fn_validate_audit_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.audit_type NOT IN ('internal','external','surveillance','closing') THEN
    RAISE EXCEPTION 'Invalid audit_type: %', NEW.audit_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_audit_type
  BEFORE INSERT OR UPDATE ON public.quality_audits
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_audit_type();

CREATE OR REPLACE FUNCTION public.fn_validate_audit_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('planned','in_progress','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid audit status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_audit_status
  BEFORE INSERT OR UPDATE ON public.quality_audits
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_audit_status();

CREATE OR REPLACE FUNCTION public.fn_next_audit_code(p_project_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_seq int;
BEGIN
  SELECT coalesce(max(cast(nullif(regexp_replace(qa.code,'[^0-9]','','g'),'') as int)),0)+1
  INTO v_seq FROM public.quality_audits qa WHERE qa.project_id = p_project_id;
  RETURN 'AI-PF17A-' || lpad(v_seq::text, 3, '0');
END; $$;

-- PART 3: Add rfi_ref column to hp_notifications
ALTER TABLE public.hp_notifications ADD COLUMN IF NOT EXISTS rfi_ref text;