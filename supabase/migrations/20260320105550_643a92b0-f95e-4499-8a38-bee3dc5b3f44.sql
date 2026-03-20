CREATE OR REPLACE FUNCTION public.fn_generate_deadline_notifications(p_project_id uuid, p_days_ahead integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_count int := 0;
  v_user_id uuid;
  v_rec record;
BEGIN
  FOR v_user_id IN
    SELECT pm.user_id FROM project_members pm
    WHERE pm.project_id = p_project_id AND pm.is_active = true
  LOOP
    FOR v_rec IN
      SELECT * FROM vw_deadlines d
      WHERE d.project_id = p_project_id
        AND d.severity IN ('critical', 'warning')
        AND d.days_remaining <= p_days_ahead
    LOOP
      INSERT INTO notifications (project_id, user_id, type, title, body, link_entity_type, link_entity_id)
      SELECT
        p_project_id,
        v_user_id,
        CASE WHEN v_rec.severity = 'critical' THEN 'expiration_overdue' ELSE 'expiration_warning' END,
        v_rec.source || ': ' || COALESCE(v_rec.doc_name, v_rec.id::text),
        'Vence em ' || v_rec.days_remaining || ' dias',
        v_rec.source,
        v_rec.id
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.project_id = p_project_id
          AND n.user_id = v_user_id
          AND n.link_entity_type = v_rec.source
          AND n.link_entity_id = v_rec.id
          AND n.created_at > now() - interval '7 days'
      );
      IF FOUND THEN v_count := v_count + 1; END IF;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;