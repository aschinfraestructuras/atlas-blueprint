
-- Monthly Quality Reports table
CREATE TABLE public.monthly_quality_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code            text NOT NULL,
  reference_month date NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','accepted')),
  submitted_at    timestamptz,
  submitted_by    uuid REFERENCES auth.users(id),
  accepted_at     timestamptz,
  -- KPI snapshot
  kpi_tests_pass_rate      numeric,
  kpi_nc_open              int,
  kpi_nc_closed_month      int,
  kpi_hp_approved          int,
  kpi_hp_total             int,
  kpi_mat_approved         int,
  kpi_mat_pending          int,
  kpi_ppi_completed        int,
  kpi_emes_expiring        int,
  -- Free text sections
  observations             text,
  corrective_actions       text,
  next_month_plan          text,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_quality_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members access monthly_quality_reports"
  ON public.monthly_quality_reports FOR ALL
  USING (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()));

CREATE INDEX idx_monthly_reports_project ON public.monthly_quality_reports(project_id);
CREATE INDEX idx_monthly_reports_month ON public.monthly_quality_reports(project_id, reference_month DESC);

CREATE OR REPLACE FUNCTION public.fn_next_rmsgq_code(p_project_id uuid)
RETURNS text LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_seq int;
BEGIN
  SELECT coalesce(max(cast(nullif(regexp_replace(mqr.code,'[^0-9]','','g'),'') as int)),0)+1
  INTO v_seq FROM public.monthly_quality_reports mqr WHERE mqr.project_id = p_project_id;
  RETURN 'RM-SGQ-PF17A-' || lpad(v_seq::text, 3, '0');
END; $$;
