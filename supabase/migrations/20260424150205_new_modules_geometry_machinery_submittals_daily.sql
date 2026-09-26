-- ═══════════════════════════════════════════════════════════════════════
-- NOVOS MÓDULOS + MELHORIAS — Pré-arranque obra PF17A (Maio 2026)
-- ═══════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 1. GEOMETRIA DE VIA — EN 13231                                      │
-- │    Campanhas de medição + leituras por PK                           │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.track_geometry_campaigns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES public.projects(id),
  work_item_id          uuid REFERENCES public.work_items(id),
  ppi_instance_id       uuid REFERENCES public.ppi_instances(id),
  campaign_code         text NOT NULL,            -- Ex: GV-PF17A-001
  campaign_date         date NOT NULL,
  pk_start              text NOT NULL,            -- Ex: 29+700
  pk_end                text NOT NULL,            -- Ex: 31+200
  track                 text,                     -- Via 1 / Via 2 / Ramal
  equipment_ref         text,                     -- Ref. equipamento medição (auscultador, etc.)
  operator_name         text,                     -- Técnico responsável
  norm_class            text NOT NULL DEFAULT 'Q2', -- Q1/Q2/Q3 per EN 13231-1
  overall_result        text NOT NULL DEFAULT 'pendente', -- conforme/nao_conforme/pendente
  observations          text,
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  is_deleted            boolean NOT NULL DEFAULT false,
  deleted_at            timestamptz
);

COMMENT ON TABLE public.track_geometry_campaigns IS
  'Campanhas de auscultação/medição de geometria de via — EN 13231-1';
COMMENT ON COLUMN public.track_geometry_campaigns.norm_class IS
  'Classe de qualidade EN 13231-1: Q1 (manutenção urgente), Q2 (intervenção), Q3 (alerta), QN (referência)';

CREATE TABLE IF NOT EXISTS public.track_geometry_readings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           uuid NOT NULL REFERENCES public.track_geometry_campaigns(id) ON DELETE CASCADE,
  pk_position           text NOT NULL,            -- PK exacto da leitura
  gauge_mm              numeric(6,1),             -- Bitola (mm) — nominal: 1668mm Ibérica / 1435mm UIC
  gauge_deviation_mm    numeric(6,1),             -- Desvio bitola
  twist_mm              numeric(6,1),             -- Empeno (mm) — base 3m
  crosslevel_mm         numeric(6,1),             -- Nível transversal (sobrelevação real vs teórica)
  longitudinal_level_mm numeric(6,1),             -- Nivelamento longitudinal
  alignment_mm          numeric(6,1),             -- Alinhamento (flecha)
  rail_profile          text,                     -- 54E1 / 60E1
  conforming            boolean,                  -- true=conforme Q/norm_class
  remarks               text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.track_geometry_readings IS
  'Leituras individuais por PK de geometria de via (bitola, empeno, nivelamento, alinhamento)';

-- Tolerâncias EN 13231-1 por classe (tabela de referência)
CREATE TABLE IF NOT EXISTS public.track_geometry_tolerances (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norm_class       text NOT NULL,       -- Q1/Q2/Q3/QN
  parameter        text NOT NULL,       -- gauge/twist/alignment/longitudinal_level
  limit_value_mm   numeric(6,1) NOT NULL,
  track_speed_kph  text,                -- Ex: ≤120 / ≤160 / >160
  notes            text
);

-- Inserir tolerâncias base EN 13231-1 (valores por omissão para via ibérica ≤120kph)
INSERT INTO public.track_geometry_tolerances (norm_class, parameter, limit_value_mm, track_speed_kph, notes) VALUES
  ('QN', 'gauge_deviation_mm',    -6,   '≤120', 'Bitola — limite inferior QN'),
  ('QN', 'gauge_deviation_mm',    33,   '≤120', 'Bitola — limite superior QN'),
  ('Q3', 'gauge_deviation_mm',    -5,   '≤120', 'Bitola — alerta Q3 inferior'),
  ('Q3', 'gauge_deviation_mm',    28,   '≤120', 'Bitola — alerta Q3 superior'),
  ('Q2', 'gauge_deviation_mm',    -4,   '≤120', 'Bitola — intervenção Q2 inferior'),
  ('Q2', 'gauge_deviation_mm',    25,   '≤120', 'Bitola — intervenção Q2 superior'),
  ('QN', 'twist_mm',              9,    '≤120', 'Empeno — limite QN (base 3m)'),
  ('Q3', 'twist_mm',              7,    '≤120', 'Empeno — alerta Q3'),
  ('Q2', 'twist_mm',              5,    '≤120', 'Empeno — intervenção Q2'),
  ('QN', 'alignment_mm',          14,   '≤120', 'Alinhamento — limite QN'),
  ('Q3', 'alignment_mm',          11,   '≤120', 'Alinhamento — alerta Q3'),
  ('Q2', 'alignment_mm',          8,    '≤120', 'Alinhamento — intervenção Q2'),
  ('QN', 'longitudinal_level_mm', 14,   '≤120', 'Nivelamento longitudinal — limite QN'),
  ('Q3', 'longitudinal_level_mm', 11,   '≤120', 'Nivelamento longitudinal — alerta Q3'),
  ('Q2', 'longitudinal_level_mm', 8,    '≤120', 'Nivelamento longitudinal — intervenção Q2')
ON CONFLICT DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_tgc_project ON public.track_geometry_campaigns (project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tgc_work_item ON public.track_geometry_campaigns (work_item_id) WHERE work_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tgr_campaign ON public.track_geometry_readings (campaign_id);

-- RLS
ALTER TABLE public.track_geometry_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_geometry_readings  ENABLE ROW LEVEL SECURITY;

CREATE POLICY tgc_project_member ON public.track_geometry_campaigns
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY tgr_via_campaign ON public.track_geometry_readings
  USING (campaign_id IN (
    SELECT id FROM track_geometry_campaigns
    WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid()))
  ));

GRANT SELECT, INSERT, UPDATE ON public.track_geometry_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.track_geometry_readings  TO authenticated;
GRANT SELECT ON public.track_geometry_tolerances TO authenticated;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 2. MAQUINARIA — Campos de inspecção, calibração e operador          │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.project_machinery
  ADD COLUMN IF NOT EXISTS operator_worker_id     uuid    NULL REFERENCES public.project_workers(id),
  ADD COLUMN IF NOT EXISTS itv_cert_ref            text    NULL,  -- Ref. inspecção técnica veículo
  ADD COLUMN IF NOT EXISTS itv_valid_until         date    NULL,  -- Validade ITV
  ADD COLUMN IF NOT EXISTS insurance_valid_until   date    NULL,  -- Validade seguro
  ADD COLUMN IF NOT EXISTS calibration_valid_until date    NULL,  -- Validade calibração (para EMEs)
  ADD COLUMN IF NOT EXISTS last_maintenance_date   date    NULL,  -- Última manutenção
  ADD COLUMN IF NOT EXISTS next_maintenance_date   date    NULL,  -- Próxima manutenção prevista
  ADD COLUMN IF NOT EXISTS horimetro_current       numeric NULL,  -- Horímetro actual (horas)
  ADD COLUMN IF NOT EXISTS max_load_t              numeric NULL,  -- Carga máxima (toneladas)
  ADD COLUMN IF NOT EXISTS discipline              text    NULL;  -- Disciplina principal de uso

COMMENT ON COLUMN public.project_machinery.itv_valid_until          IS 'Validade da Inspecção Técnica do Veículo (ITV/IPO)';
COMMENT ON COLUMN public.project_machinery.calibration_valid_until  IS 'Validade da calibração — para Equipamentos de Medição e Ensaio (EME)';
COMMENT ON COLUMN public.project_machinery.horimetro_current        IS 'Horímetro actual em horas de trabalho';
COMMENT ON COLUMN public.project_machinery.operator_worker_id       IS 'Operador principal (FK para project_workers)';

-- Índice parcial para expirations
CREATE INDEX IF NOT EXISTS idx_machinery_itv_expiry
  ON public.project_machinery (itv_valid_until)
  WHERE itv_valid_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_machinery_insurance_expiry
  ON public.project_machinery (insurance_valid_until)
  WHERE insurance_valid_until IS NOT NULL;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 3. SUBMITTALS — Ligação ao PAME/Materiais                           │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.technical_office_items
  ADD COLUMN IF NOT EXISTS material_id      uuid NULL REFERENCES public.materials(id),
  ADD COLUMN IF NOT EXISTS work_item_id_sub uuid NULL REFERENCES public.work_items(id),
  ADD COLUMN IF NOT EXISTS pame_ref         text NULL,   -- Ref. PAME associado
  ADD COLUMN IF NOT EXISTS spec_ref         text NULL,   -- Referência de especificação/norma
  ADD COLUMN IF NOT EXISTS revision_no      text NULL,   -- Revisão do submittal
  ADD COLUMN IF NOT EXISTS response_due     date NULL,   -- Prazo de resposta da fiscalização
  ADD COLUMN IF NOT EXISTS responded_at     date NULL;   -- Data de resposta real

COMMENT ON COLUMN public.technical_office_items.material_id      IS 'Material do PAME a que este submittal se refere';
COMMENT ON COLUMN public.technical_office_items.work_item_id_sub IS 'Frente de obra onde o material/método é aplicado';
COMMENT ON COLUMN public.technical_office_items.pame_ref         IS 'Referência do Plano de Aprovação de Material (PAME)';

CREATE INDEX IF NOT EXISTS idx_toi_material ON public.technical_office_items (material_id) WHERE material_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_toi_workitem ON public.technical_office_items (work_item_id_sub) WHERE work_item_id_sub IS NOT NULL;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 4. PARTES DIÁRIAS — Campos globais adicionais                       │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS temp_min_c           numeric NULL,  -- Temperatura mínima (°C)
  ADD COLUMN IF NOT EXISTS temp_max_c           numeric NULL,  -- Temperatura máxima (°C)
  ADD COLUMN IF NOT EXISTS wind_speed           text    NULL,  -- Vento: calmo/moderado/forte
  ADD COLUMN IF NOT EXISTS work_hours           numeric NULL,  -- Horas de trabalho efectivo
  ADD COLUMN IF NOT EXISTS work_item_id         uuid    NULL REFERENCES public.work_items(id),
  ADD COLUMN IF NOT EXISTS responsible_name     text    NULL,  -- Responsável de obra (TQ/Encarregado)
  ADD COLUMN IF NOT EXISTS incidents_count      integer NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workers_count        integer NULL,  -- N.º total de trabalhadores no dia
  ADD COLUMN IF NOT EXISTS subcontractor_id_dr  uuid    NULL REFERENCES public.subcontractors(id);

COMMENT ON COLUMN public.daily_reports.temp_min_c          IS 'Temperatura mínima do dia (°C) — relevante para betão e soldadura';
COMMENT ON COLUMN public.daily_reports.work_hours          IS 'Total de horas de trabalho efectivo no dia';
COMMENT ON COLUMN public.daily_reports.work_item_id        IS 'Frente de obra principal do dia';
COMMENT ON COLUMN public.daily_reports.workers_count       IS 'Número total de trabalhadores presentes no dia';

CREATE INDEX IF NOT EXISTS idx_dr_work_item ON public.daily_reports (work_item_id) WHERE work_item_id IS NOT NULL;
