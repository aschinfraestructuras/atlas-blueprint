-- Alinhamento com Anx. C do PQO-PF17A-001

-- [1] Soldaduras — FUS code + certificação US
ALTER TABLE public.weld_records
  ADD COLUMN IF NOT EXISTS fus_code         text,
  ADD COLUMN IF NOT EXISTS fus_date         date,
  ADD COLUMN IF NOT EXISTS cert_operator_us text;

-- [2] Topografia — FT code + desvio de cota
ALTER TABLE public.topography_controls
  ADD COLUMN IF NOT EXISTS ft_code          text,
  ADD COLUMN IF NOT EXISTS cota_projeto     numeric(10,4),
  ADD COLUMN IF NOT EXISTS cota_executado   numeric(10,4),
  ADD COLUMN IF NOT EXISTS desvio_cota      numeric(8,4);

-- [3] Ensaios — BE code
ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS be_code          text,
  ADD COLUMN IF NOT EXISTS lab_report_ref   text;

-- [4] HP/ATA-Q — código ATA + aprovador F/IP
ALTER TABLE public.hp_notifications
  ADD COLUMN IF NOT EXISTS ata_code         text,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_entity  text;

-- [5] RM-SGQ — KPIs adicionais conforme Anx. D do PQO
ALTER TABLE public.monthly_quality_reports
  ADD COLUMN IF NOT EXISTS kpi_nc_overdue_15d  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_rm_on_time      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS kpi_pame_rate_pct   numeric(5,2),
  ADD COLUMN IF NOT EXISTS kpi_hp_rate_pct     numeric(5,2);

-- [6] Ligação auditoria → NC
ALTER TABLE public.non_conformities
  ADD COLUMN IF NOT EXISTS audit_id uuid REFERENCES public.quality_audits(id);

CREATE INDEX IF NOT EXISTS idx_nc_audit
  ON public.non_conformities (audit_id)
  WHERE audit_id IS NOT NULL;

-- [7] Habilitações ferroviárias — QUAL-FUNC-NNN
CREATE TABLE IF NOT EXISTS public.worker_qualifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  worker_id     uuid REFERENCES public.project_workers(id) ON DELETE SET NULL,
  qual_code     text NOT NULL,
  worker_name   text NOT NULL,
  qualification text NOT NULL,
  cert_ref      text,
  issued_by     text,
  valid_from    date,
  valid_until   date,
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_qualifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qual_select" ON public.worker_qualifications FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "qual_write" ON public.worker_qualifications FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('admin','manager')
  ));

CREATE INDEX IF NOT EXISTS idx_worker_qual_project ON public.worker_qualifications(project_id);
CREATE INDEX IF NOT EXISTS idx_worker_qual_valid   ON public.worker_qualifications(valid_until);

-- [8] View KPIs do RM-SGQ conforme Anx. D do PQO
CREATE OR REPLACE VIEW public.vw_rm_kpis
WITH (security_invoker = true)
AS
WITH
nc_stats AS (
  SELECT project_id,
    COUNT(*) FILTER (WHERE status IN ('open','in_progress') AND is_deleted=false) AS nc_open,
    COUNT(*) FILTER (
      WHERE status IN ('open','in_progress')
      AND is_deleted=false
      AND detected_at < CURRENT_DATE - INTERVAL '15 days'
    ) AS nc_overdue_15d
  FROM public.non_conformities GROUP BY project_id
),
hp_stats AS (
  SELECT project_id,
    COUNT(*) AS hp_total,
    COUNT(*) FILTER (WHERE status='approved') AS hp_approved
  FROM public.hp_notifications GROUP BY project_id
),
mat_stats AS (
  SELECT project_id,
    COUNT(*) AS mat_total,
    COUNT(*) FILTER (WHERE approval_status='approved') AS mat_approved,
    COUNT(*) FILTER (WHERE approval_status IN ('pending','submitted')) AS mat_pending
  FROM public.materials WHERE is_deleted=false GROUP BY project_id
),
test_stats AS (
  SELECT project_id,
    COUNT(*) AS tests_total,
    COUNT(*) FILTER (WHERE pass_fail='pass') AS tests_pass
  FROM public.test_results GROUP BY project_id
),
weld_stats AS (
  SELECT project_id,
    COUNT(*) AS welds_total,
    COUNT(*) FILTER (WHERE has_ut=true AND ut_result='pass') AS welds_us_ok,
    COUNT(*) FILTER (WHERE has_ut=false OR ut_result IS NULL) AS welds_us_pending
  FROM public.weld_records GROUP BY project_id
)
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.code AS project_code,

  -- KPI 1: Taxa conformidade ensaios ≥ 95%
  COALESCE(ts.tests_total, 0) AS tests_total,
  COALESCE(ts.tests_pass, 0) AS tests_pass,
  CASE WHEN COALESCE(ts.tests_total,0)=0 THEN NULL
    ELSE ROUND(ts.tests_pass*100.0/ts.tests_total,1) END AS kpi_tests_pass_pct,
  CASE WHEN COALESCE(ts.tests_total,0)=0 THEN 'sem_dados'
    WHEN ts.tests_pass*100.0/ts.tests_total >= 95 THEN 'ok'
    ELSE 'alerta' END AS kpi_tests_status,

  -- KPI 2: HPs 100% aprovados
  COALESCE(hs.hp_total,0) AS hp_total,
  COALESCE(hs.hp_approved,0) AS hp_approved,
  CASE WHEN COALESCE(hs.hp_total,0)=0 THEN NULL
    ELSE ROUND(hs.hp_approved*100.0/hs.hp_total,1) END AS kpi_hp_rate_pct,
  CASE WHEN COALESCE(hs.hp_total,0)=0 THEN 'sem_dados'
    WHEN hs.hp_approved=hs.hp_total THEN 'ok'
    ELSE 'alerta' END AS kpi_hp_status,

  -- KPI 3: PAME 100% aprovado
  COALESCE(ms.mat_total,0) AS mat_total,
  COALESCE(ms.mat_approved,0) AS mat_approved,
  COALESCE(ms.mat_pending,0) AS mat_pending,
  CASE WHEN COALESCE(ms.mat_total,0)=0 THEN 'sem_dados'
    WHEN ms.mat_pending=0 THEN 'ok'
    ELSE 'alerta' END AS kpi_pame_status,

  -- KPI 4: RNCs em aberto >15 dias = 0
  COALESCE(nc.nc_open,0) AS nc_open,
  COALESCE(nc.nc_overdue_15d,0) AS nc_overdue_15d,
  CASE WHEN COALESCE(nc.nc_overdue_15d,0)=0 THEN 'ok'
    ELSE 'alerta' END AS kpi_nc_overdue_status,

  -- US soldaduras — normativo 100% (EN 14587-1 §6.3)
  COALESCE(ws.welds_total,0) AS welds_total,
  COALESCE(ws.welds_us_ok,0) AS welds_us_ok,
  COALESCE(ws.welds_us_pending,0) AS welds_us_pending,
  CASE WHEN COALESCE(ws.welds_total,0)=0 THEN 'sem_dados'
    WHEN ws.welds_us_pending=0 THEN 'ok'
    ELSE 'alerta' END AS kpi_us_status

FROM public.projects p
LEFT JOIN nc_stats nc   ON nc.project_id  = p.id
LEFT JOIN hp_stats hs   ON hs.project_id  = p.id
LEFT JOIN mat_stats ms  ON ms.project_id  = p.id
LEFT JOIN test_stats ts ON ts.project_id  = p.id
LEFT JOIN weld_stats ws ON ws.project_id  = p.id
WHERE p.status = 'active';
