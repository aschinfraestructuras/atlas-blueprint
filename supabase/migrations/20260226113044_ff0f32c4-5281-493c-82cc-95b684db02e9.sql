-- Ensure creators are always added as project admins
DROP TRIGGER IF EXISTS trg_projects_add_creator_member ON public.projects;
CREATE TRIGGER trg_projects_add_creator_member
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.fn_add_creator_as_project_admin();

-- Backfill missing creator memberships (legacy projects)
INSERT INTO public.project_members (project_id, user_id, role, is_active)
SELECT p.id, p.created_by, 'admin', true
FROM public.projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = p.id
      AND pm.user_id = p.created_by
  );

-- Fast lookup for pending invites by email
CREATE INDEX IF NOT EXISTS idx_project_invites_email_pending
ON public.project_invites (email, accepted_at, expires_at);

-- Auto-claim pending invites for current authenticated user
CREATE OR REPLACE FUNCTION public.fn_claim_my_pending_invites()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_claimed_count integer := 0;
  v_rec record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('status', 'no_email', 'claimed', 0);
  END IF;

  FOR v_rec IN
    SELECT id, project_id, role
    FROM public.project_invites
    WHERE lower(email) = v_email
      AND accepted_at IS NULL
      AND expires_at > now()
    ORDER BY created_at ASC
  LOOP
    INSERT INTO public.project_members (project_id, user_id, role, is_active)
    VALUES (v_rec.project_id, auth.uid(), v_rec.role, true)
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, is_active = true;

    UPDATE public.project_invites
    SET accepted_at = now()
    WHERE id = v_rec.id;

    INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
    VALUES (
      v_rec.project_id,
      auth.uid(),
      'project_members',
      auth.uid(),
      'INVITE_ACCEPTED',
      'settings',
      jsonb_build_object('role', v_rec.role, 'method', 'auto_claim')
    );

    v_claimed_count := v_claimed_count + 1;
  END LOOP;

  RETURN jsonb_build_object('status', 'ok', 'claimed', v_claimed_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_claim_my_pending_invites() TO authenticated;

-- Keep project visibility strictly membership-based (except global admins)
CREATE OR REPLACE FUNCTION public.fn_list_my_projects()
RETURNS SETOF projects
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'tenant_admin') THEN
    RETURN QUERY SELECT * FROM public.projects ORDER BY created_at DESC;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.projects p
  JOIN public.project_members pm ON pm.project_id = p.id
  WHERE pm.user_id = auth.uid()
    AND pm.is_active = true
  ORDER BY p.created_at DESC;
END;
$$;