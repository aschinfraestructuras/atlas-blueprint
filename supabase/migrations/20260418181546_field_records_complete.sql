-- Completar tabela field_records com colunas em falta
ALTER TABLE public.field_records
  ADD COLUMN IF NOT EXISTS disciplina        TEXT,
  ADD COLUMN IF NOT EXISTS elemento          TEXT,
  ADD COLUMN IF NOT EXISTS pk_fim            TEXT,
  ADD COLUMN IF NOT EXISTS tq_name           TEXT,
  ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS is_deleted        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_inspection   TEXT,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_field_records_project
  ON public.field_records(project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_field_records_ppi
  ON public.field_records(ppi_instance_id)
  WHERE ppi_instance_id IS NOT NULL;

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_field_records_updated_at ON public.field_records;
CREATE TRIGGER update_field_records_updated_at
  BEFORE UPDATE ON public.field_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (se ainda não existir)
ALTER TABLE public.field_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_record_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_record_checks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'field_records' AND policyname = 'field_records_project_members'
  ) THEN
    CREATE POLICY field_records_project_members ON public.field_records
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = field_records.project_id
          AND pm.user_id = (SELECT auth.uid())
          AND pm.is_active = true
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'field_record_materials' AND policyname = 'frm_project_members'
  ) THEN
    CREATE POLICY frm_project_members ON public.field_record_materials
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.field_records fr
        JOIN public.project_members pm ON pm.project_id = fr.project_id
        WHERE fr.id = field_record_materials.record_id
          AND pm.user_id = (SELECT auth.uid())
          AND pm.is_active = true
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'field_record_checks' AND policyname = 'frc_project_members'
  ) THEN
    CREATE POLICY frc_project_members ON public.field_record_checks
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.field_records fr
        JOIN public.project_members pm ON pm.project_id = fr.project_id
        WHERE fr.id = field_record_checks.record_id
          AND pm.user_id = (SELECT auth.uid())
          AND pm.is_active = true
      ));
  END IF;
END $$;

-- Função de geração de código GR-PF17A-001
CREATE OR REPLACE FUNCTION public.fn_next_gr_code(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_code TEXT;
  v_seq          INT;
BEGIN
  SELECT code INTO v_project_code FROM public.projects WHERE id = p_project_id;
  SELECT COUNT(*) + 1 INTO v_seq
    FROM public.field_records
    WHERE project_id = p_project_id;
  RETURN COALESCE(v_project_code, 'GR') || '-GR-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_next_gr_code(UUID) TO authenticated;
