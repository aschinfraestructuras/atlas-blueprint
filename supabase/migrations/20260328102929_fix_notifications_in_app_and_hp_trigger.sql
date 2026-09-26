-- ============================================================
-- [6] TRIGGER: notificação in-app quando PPI aprovado
-- tem itens HP sem notificação criada
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_notify_hp_missing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hp_items_count int;
  v_notified_count int;
  v_project_id uuid;
  v_inspector_id uuid;
BEGIN
  -- Só activa quando PPI passa para 'approved'
  IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Contar itens HP neste PPI
  SELECT COUNT(*) INTO v_hp_items_count
  FROM public.ppi_instance_items
  WHERE instance_id = NEW.id
    AND inspection_point_type = 'hp';

  IF v_hp_items_count = 0 THEN RETURN NEW; END IF;

  -- Contar notificações HP já criadas
  SELECT COUNT(*) INTO v_notified_count
  FROM public.hp_notifications
  WHERE instance_id = NEW.id;

  -- Se há itens HP sem notificação, criar aviso in-app
  IF v_notified_count < v_hp_items_count THEN
    SELECT project_id, inspector_id INTO v_project_id, v_inspector_id
    FROM public.ppi_instances WHERE id = NEW.id;

    -- Notificação in-app para o inspector e para admins
    INSERT INTO public.notifications (project_id, user_id, type, title, body, link_entity_type, link_entity_id)
    SELECT
      v_project_id,
      pm.user_id,
      'warning',
      'PPI aprovado — verificar HPs',
      'O PPI ' || NEW.code || ' foi aprovado mas tem ' || (v_hp_items_count - v_notified_count) || ' item(s) HP sem notificação criada.',
      'ppi',
      NEW.id
    FROM public.project_members pm
    WHERE pm.project_id = v_project_id
      AND pm.is_active = true
      AND pm.role IN ('admin','quality_manager')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ppi_approved_check_hp ON public.ppi_instances;
CREATE TRIGGER trg_ppi_approved_check_hp
  AFTER UPDATE OF status ON public.ppi_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_notify_hp_missing();

-- ============================================================
-- [7] CORRIGIR índice de readiness (era 'BLOCKED' maiúsculas)
-- O índice parcial estava a filtrar por valor que nunca existe
-- ============================================================
DROP INDEX IF EXISTS public.idx_work_items_readiness;
CREATE INDEX idx_work_items_readiness_blocked
  ON public.work_items (project_id, readiness_status)
  WHERE readiness_status IN ('blocked','not_ready') AND is_deleted = false;

-- ============================================================
-- [8] ÍNDICE em non_conformities.detected_at
-- Muito usado nas queries de aging e dashboard
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_nc_detected_at
  ON public.non_conformities (project_id, detected_at)
  WHERE is_deleted = false;

-- ============================================================
-- [9] ÍNDICE em concrete_batches.batch_date
-- Usado em fn_qc_report_summary e views mensais
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_concrete_batch_date_project
  ON public.concrete_batches (project_id, batch_date DESC);
