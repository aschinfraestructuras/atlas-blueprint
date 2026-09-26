-- ═══════════════════════════════════════════════════════════════════════
-- 1. ALTERAÇÕES TÉCNICAS E DESVIOS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.technical_changes (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid        NOT NULL REFERENCES public.projects(id),
  code                    text        NOT NULL DEFAULT '',
  change_type             text        NOT NULL DEFAULT 'site_instruction',
  title                   text        NOT NULL,
  description             text,
  origin_ref              text,
  requested_by            text,
  affected_work_item_id   uuid        REFERENCES public.work_items(id),
  affected_document_id    uuid        REFERENCES public.documents(id),
  rfi_id                  uuid        REFERENCES public.rfis(id),
  status                  text        NOT NULL DEFAULT 'draft',
  priority                text        NOT NULL DEFAULT 'medium',
  submitted_at            date,
  approved_at             date,
  approved_by             text,
  approval_ref            text,
  implementation_deadline date,
  implemented_at          date,
  requires_new_test       boolean     NOT NULL DEFAULT false,
  test_result_id          uuid        REFERENCES public.test_results(id),
  dfo_impact              text,
  notes                   text,
  created_by              uuid        REFERENCES auth.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  is_deleted              boolean     NOT NULL DEFAULT false,
  deleted_at              timestamptz
);

COMMENT ON TABLE public.technical_changes IS
  'Registo formal de alterações técnicas, instruções de fiscalização, desvios aprovados e soluções alternativas em obra';

-- Função de código automático
CREATE OR REPLACE FUNCTION fn_set_technical_change_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  proj_code text;
  next_num  int;
BEGIN
  IF NEW.code = '' OR NEW.code IS NULL THEN
    SELECT COALESCE(p.code, 'PRJ') INTO proj_code
    FROM projects p WHERE p.id = NEW.project_id;
    SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS int)), 0) + 1
    INTO next_num
    FROM technical_changes
    WHERE project_id = NEW.project_id AND code ~ '[0-9]+';
    NEW.code := 'TC-' || proj_code || '-' || LPAD(next_num::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger updated_at usando set_updated_at (existe na BD)
CREATE OR REPLACE FUNCTION fn_tc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_technical_change_code
  BEFORE INSERT ON public.technical_changes
  FOR EACH ROW EXECUTE FUNCTION fn_set_technical_change_code();

CREATE TRIGGER trg_technical_changes_updated_at
  BEFORE UPDATE ON public.technical_changes
  FOR EACH ROW EXECUTE FUNCTION fn_tc_updated_at();

CREATE INDEX IF NOT EXISTS idx_tc_project   ON public.technical_changes (project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tc_status    ON public.technical_changes (project_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tc_deadline  ON public.technical_changes (implementation_deadline) WHERE implementation_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tc_work_item ON public.technical_changes (affected_work_item_id) WHERE affected_work_item_id IS NOT NULL;

ALTER TABLE public.technical_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tc_project_member ON public.technical_changes
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())));
GRANT SELECT, INSERT, UPDATE ON public.technical_changes TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════
-- 2. GESTÃO DE RISCOS E OPORTUNIDADES
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.risk_register (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid        NOT NULL REFERENCES public.projects(id),
  code                  text        NOT NULL DEFAULT '',
  is_opportunity        boolean     NOT NULL DEFAULT false,
  risk_category         text        NOT NULL DEFAULT 'other',
  title                 text        NOT NULL,
  description           text,
  origin                text,
  probability           int         NOT NULL DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
  impact                int         NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  risk_level            text        GENERATED ALWAYS AS (
    CASE
      WHEN (probability * impact) >= 15 THEN 'critical'
      WHEN (probability * impact) >= 9  THEN 'high'
      WHEN (probability * impact) >= 5  THEN 'medium'
      ELSE 'low'
    END
  ) STORED,
  preventive_measure    text,
  contingency_measure   text,
  responsible_name      text,
  work_item_id          uuid        REFERENCES public.work_items(id),
  status                text        NOT NULL DEFAULT 'open',
  review_date           date,
  residual_probability  int         CHECK (residual_probability BETWEEN 1 AND 5),
  residual_impact       int         CHECK (residual_impact BETWEEN 1 AND 5),
  residual_level        text        GENERATED ALWAYS AS (
    CASE
      WHEN residual_probability IS NULL OR residual_impact IS NULL THEN NULL
      WHEN (residual_probability * residual_impact) >= 15 THEN 'critical'
      WHEN (residual_probability * residual_impact) >= 9  THEN 'high'
      WHEN (residual_probability * residual_impact) >= 5  THEN 'medium'
      ELSE 'low'
    END
  ) STORED,
  notes                 text,
  created_by            uuid        REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  is_deleted            boolean     NOT NULL DEFAULT false,
  deleted_at            timestamptz
);

COMMENT ON TABLE public.risk_register IS
  'Registo de riscos e oportunidades — ISO 9001:2015 cláusula 6.1';

CREATE OR REPLACE FUNCTION fn_set_risk_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  proj_code text;
  next_num  int;
  prefix    text;
BEGIN
  IF NEW.code = '' OR NEW.code IS NULL THEN
    SELECT COALESCE(p.code, 'PRJ') INTO proj_code FROM projects p WHERE p.id = NEW.project_id;
    prefix := CASE WHEN NEW.is_opportunity THEN 'OPP' ELSE 'RISK' END;
    SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS int)), 0) + 1
    INTO next_num FROM risk_register WHERE project_id = NEW.project_id AND code ~ '[0-9]+';
    NEW.code := prefix || '-' || proj_code || '-' || LPAD(next_num::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_risk_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_risk_code
  BEFORE INSERT ON public.risk_register
  FOR EACH ROW EXECUTE FUNCTION fn_set_risk_code();

CREATE TRIGGER trg_risk_updated_at
  BEFORE UPDATE ON public.risk_register
  FOR EACH ROW EXECUTE FUNCTION fn_risk_updated_at();

CREATE INDEX IF NOT EXISTS idx_risk_project ON public.risk_register (project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_risk_level   ON public.risk_register (project_id, risk_level) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_risk_status  ON public.risk_register (project_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_risk_review  ON public.risk_register (review_date) WHERE review_date IS NOT NULL;

ALTER TABLE public.risk_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY risk_project_member ON public.risk_register
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())));
GRANT SELECT, INSERT, UPDATE ON public.risk_register TO authenticated;
