-- Adicionar colunas em falta em planning_activities
ALTER TABLE public.planning_activities
  ADD COLUMN IF NOT EXISTS code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Índices planning_activities
CREATE INDEX IF NOT EXISTS idx_planning_act_not_deleted
  ON public.planning_activities (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_planning_act_code
  ON public.planning_activities (project_id, code)
  WHERE code IS NOT NULL;

-- Índices partial nas tabelas com is_deleted
CREATE INDEX IF NOT EXISTS idx_materials_not_deleted
  ON public.materials (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_documents_not_deleted
  ON public.documents (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_test_results_not_deleted
  ON public.test_results (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_nc_not_deleted_status
  ON public.non_conformities (project_id, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_work_items_not_deleted
  ON public.work_items (project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_ppi_not_deleted_workitem
  ON public.ppi_instances (project_id, work_item_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_test_due_not_deleted
  ON public.test_due_items (project_id)
  WHERE is_deleted = false;

-- Índices gerais de performance
CREATE INDEX IF NOT EXISTS idx_notifications_log_proj_date
  ON public.notifications_log (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_module
  ON public.audit_log (project_id, module, created_at DESC);

-- Trigger de geração de código de actividade
CREATE OR REPLACE FUNCTION public.fn_generate_activity_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_wbs_code text;
  v_seq      integer;
BEGIN
  IF NEW.code IS NOT NULL AND trim(NEW.code) != '' THEN
    RETURN NEW;
  END IF;

  SELECT wbs_code INTO v_wbs_code
  FROM public.planning_wbs WHERE id = NEW.wbs_id;

  IF v_wbs_code IS NULL THEN v_wbs_code := 'GEN'; END IF;

  SELECT COALESCE(MAX(
    CASE
      WHEN code ~ ('^' || regexp_replace(v_wbs_code, '\.', '\.', 'g') || '-[0-9]+$')
      THEN (regexp_replace(code, '^.*-([0-9]+)$', '\1'))::integer
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM public.planning_activities
  WHERE project_id = NEW.project_id
    AND wbs_id = NEW.wbs_id
    AND is_deleted = false;

  NEW.code := v_wbs_code || '-' || LPAD(v_seq::text, 3, '0');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_activity_code ON public.planning_activities;
CREATE TRIGGER trg_activity_code
  BEFORE INSERT ON public.planning_activities
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_activity_code();
