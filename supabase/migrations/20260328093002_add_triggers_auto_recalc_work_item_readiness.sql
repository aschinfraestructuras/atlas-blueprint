-- Função genérica de trigger que chama fn_recalc_work_item_readiness
-- quando o work_item_id relevante muda
CREATE OR REPLACE FUNCTION public.trg_fn_recalc_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_work_item_id uuid;
BEGIN
  -- Para DELETE usa OLD, para INSERT/UPDATE usa NEW
  IF TG_OP = 'DELETE' THEN
    v_work_item_id := OLD.work_item_id;
  ELSE
    v_work_item_id := NEW.work_item_id;
  END IF;

  -- Se o work_item mudou numa UPDATE, recalcular o antigo também
  IF TG_OP = 'UPDATE' AND OLD.work_item_id IS DISTINCT FROM NEW.work_item_id THEN
    IF OLD.work_item_id IS NOT NULL THEN
      PERFORM public.fn_recalc_work_item_readiness(OLD.work_item_id);
    END IF;
  END IF;

  IF v_work_item_id IS NOT NULL THEN
    PERFORM public.fn_recalc_work_item_readiness(v_work_item_id);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Trigger em non_conformities
-- Recalcula quando uma NC é criada, fechada, ou muda de work_item
DROP TRIGGER IF EXISTS trg_nc_recalc_readiness ON public.non_conformities;
CREATE TRIGGER trg_nc_recalc_readiness
  AFTER INSERT OR UPDATE OF status, work_item_id, is_deleted OR DELETE
  ON public.non_conformities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_recalc_readiness();

-- Trigger em ppi_instances
-- Recalcula quando um PPI muda de estado ou é apagado
DROP TRIGGER IF EXISTS trg_ppi_recalc_readiness ON public.ppi_instances;
CREATE TRIGGER trg_ppi_recalc_readiness
  AFTER INSERT OR UPDATE OF status, work_item_id, is_deleted OR DELETE
  ON public.ppi_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_recalc_readiness();

-- Trigger em test_results (sistema genérico)
-- Recalcula quando um resultado de ensaio muda de estado
DROP TRIGGER IF EXISTS trg_test_results_recalc_readiness ON public.test_results;
CREATE TRIGGER trg_test_results_recalc_readiness
  AFTER INSERT OR UPDATE OF status_workflow, work_item_id, is_deleted OR DELETE
  ON public.test_results
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_recalc_readiness();
