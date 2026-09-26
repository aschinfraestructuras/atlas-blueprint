-- Verificar e corrigir RLS de planning_activities (agora tem is_deleted)
-- Garantir que as políticas existentes funcionam com o novo campo

-- Actualizar o trigger de soft-delete para planning_activities
-- (garante que ao eliminar uma actividade, is_deleted=true e não há DELETE físico)
CREATE OR REPLACE FUNCTION public.fn_soft_delete_planning_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Impedir DELETE físico — usar soft-delete
  RAISE EXCEPTION 'Use soft-delete: UPDATE planning_activities SET is_deleted=true WHERE id=%', OLD.id
    USING ERRCODE = 'restrict_violation';
END;
$function$;

-- Aplicar trigger anti-delete-físico
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_activities ON public.planning_activities;
CREATE TRIGGER trg_prevent_hard_delete_activities
  BEFORE DELETE ON public.planning_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_soft_delete_planning_activity();
