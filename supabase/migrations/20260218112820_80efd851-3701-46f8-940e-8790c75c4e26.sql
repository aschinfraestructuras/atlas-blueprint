
-- ============================================================
-- Migration: New structural modules
-- technical_office_items, plans, survey_records, subcontractors
-- ============================================================

-- 1. Technical Office Items (RFIs, Submittals, Clarifications)
CREATE TABLE IF NOT EXISTS public.technical_office_items (
  id          uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid    NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by  uuid    NOT NULL,
  type        text    NOT NULL DEFAULT 'RFI',          -- RFI | Submittal | Clarification
  title       text    NOT NULL,
  description text,
  status      text    NOT NULL DEFAULT 'open',          -- open | in_progress | closed | cancelled
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_office_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "to_items_select"  ON public.technical_office_items FOR SELECT  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "to_items_insert"  ON public.technical_office_items FOR INSERT  WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "to_items_update"  ON public.technical_office_items FOR UPDATE  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "to_items_delete"  ON public.technical_office_items FOR DELETE  USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER trg_to_items_updated_at
  BEFORE UPDATE ON public.technical_office_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_to_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.technical_office_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();


-- 2. Plans (PQO, PIE, PPI, ITP, Method Statement, Test Plan, Schedule)
CREATE TABLE IF NOT EXISTS public.plans (
  id          uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid    NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by  uuid    NOT NULL,
  plan_type   text    NOT NULL DEFAULT 'PQO',           -- PQO | PIE | PPI | ITP | MethodStatement | TestPlan | Schedule
  title       text    NOT NULL,
  revision    text             DEFAULT '0',
  status      text    NOT NULL DEFAULT 'draft',          -- draft | under_review | approved | superseded
  file_url    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select"  ON public.plans FOR SELECT  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "plans_insert"  ON public.plans FOR INSERT  WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "plans_update"  ON public.plans FOR UPDATE  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "plans_delete"  ON public.plans FOR DELETE  USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_plans_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();


-- 3. Survey Records (Topografia)
CREATE TABLE IF NOT EXISTS public.survey_records (
  id          uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid    NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by  uuid    NOT NULL,
  area_or_pk  text    NOT NULL,                          -- e.g. "PK 1+500", "Bloco A"
  description text,
  date        date    NOT NULL DEFAULT CURRENT_DATE,
  status      text    NOT NULL DEFAULT 'pending',        -- pending | validated | rejected
  file_url    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "survey_select"  ON public.survey_records FOR SELECT  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "survey_insert"  ON public.survey_records FOR INSERT  WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "survey_update"  ON public.survey_records FOR UPDATE  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "survey_delete"  ON public.survey_records FOR DELETE  USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER trg_survey_updated_at
  BEFORE UPDATE ON public.survey_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_survey_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.survey_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();


-- 4. Subcontractors (separate module, optional link to suppliers)
CREATE TABLE IF NOT EXISTS public.subcontractors (
  id            uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    uuid    NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by    uuid    NOT NULL,
  name          text    NOT NULL,
  trade         text,                                    -- e.g. Estruturas, Impermeabilização, Elétrico
  status        text    NOT NULL DEFAULT 'active',       -- active | suspended | concluded
  contact_email text,
  supplier_id   uuid    REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_select"  ON public.subcontractors FOR SELECT  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "sub_insert"  ON public.subcontractors FOR INSERT  WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "sub_update"  ON public.subcontractors FOR UPDATE  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "sub_delete"  ON public.subcontractors FOR DELETE  USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER trg_sub_updated_at
  BEFORE UPDATE ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_sub_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
