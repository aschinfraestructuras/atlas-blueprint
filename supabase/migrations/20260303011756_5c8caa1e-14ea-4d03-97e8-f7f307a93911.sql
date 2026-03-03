
-- Fix the recalc function to cast entity_id properly as uuid
CREATE OR REPLACE FUNCTION public.fn_recalc_work_item_readiness(p_work_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_has_open_nc boolean;
    v_has_pending_ppi boolean;
    v_has_pending_tests boolean;
    v_old_status text;
    v_new_status text;
BEGIN
    IF p_work_item_id IS NULL THEN
        RETURN;
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM public.non_conformities
        WHERE work_item_id = p_work_item_id
          AND status IN ('open', 'in_progress', 'pending_verification', 'draft')
    ) INTO v_has_open_nc;

    SELECT EXISTS(
        SELECT 1 FROM public.ppi_instances
        WHERE work_item_id = p_work_item_id
          AND status IN ('draft', 'in_progress', 'submitted')
    ) INTO v_has_pending_ppi;

    SELECT EXISTS(
        SELECT 1 FROM public.test_results
        WHERE work_item_id = p_work_item_id
          AND status_workflow IN ('draft', 'in_progress', 'pending', 'submitted')
    ) INTO v_has_pending_tests;

    SELECT readiness_status INTO v_old_status
    FROM public.work_items
    WHERE id = p_work_item_id;

    IF (v_has_open_nc OR v_has_pending_ppi OR v_has_pending_tests) THEN
        v_new_status := 'blocked';
    ELSE
        v_new_status := 'ready';
    END IF;

    UPDATE public.work_items
    SET has_open_nc = v_has_open_nc,
        has_pending_ppi = v_has_pending_ppi,
        has_pending_tests = v_has_pending_tests,
        readiness_status = v_new_status,
        updated_at = now()
    WHERE id = p_work_item_id;

    -- Audit log if readiness changed
    IF v_old_status IS DISTINCT FROM v_new_status THEN
        INSERT INTO public.audit_log (
            project_id, entity, entity_id, action, module, description, created_at
        )
        SELECT
            project_id, 'work_items', id,
            'STATUS_CHANGE', 'work_items',
            'Readiness: ' || COALESCE(v_old_status, 'null') || ' → ' || v_new_status,
            now()
        FROM public.work_items
        WHERE id = p_work_item_id;
    END IF;
END;
$$;

-- Backfill all existing work items
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.work_items LOOP
        PERFORM public.fn_recalc_work_item_readiness(r.id);
    END LOOP;
END;
$$;
