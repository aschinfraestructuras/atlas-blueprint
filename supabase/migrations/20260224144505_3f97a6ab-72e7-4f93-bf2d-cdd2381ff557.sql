
-- ═══════════════════════════════════════════════════════════════
-- 1. project_invites table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_invites_project ON public.project_invites(project_id);
CREATE INDEX idx_project_invites_email ON public.project_invites(email);
CREATE INDEX idx_project_invites_token ON public.project_invites(token);

ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- Only project admins can see/manage invites
CREATE POLICY "invites_select" ON public.project_invites
  FOR SELECT USING (is_project_admin(auth.uid(), project_id) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "invites_insert" ON public.project_invites
  FOR INSERT WITH CHECK (is_project_admin(auth.uid(), project_id));

CREATE POLICY "invites_update" ON public.project_invites
  FOR UPDATE USING (is_project_admin(auth.uid(), project_id));

CREATE POLICY "invites_delete" ON public.project_invites
  FOR DELETE USING (is_project_admin(auth.uid(), project_id));

-- ═══════════════════════════════════════════════════════════════
-- 2. RPC: fn_invite_project_member
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_invite_project_member(
  p_project_id uuid,
  p_email text,
  p_role text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_user uuid;
  v_token text;
  v_invite_id uuid;
BEGIN
  -- Validate caller is project admin
  IF NOT public.is_project_admin(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: must be project admin';
  END IF;

  -- Check if user already exists in auth.users
  SELECT id INTO v_existing_user
  FROM auth.users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  -- If user exists and is already a member, raise error
  IF v_existing_user IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = p_project_id AND user_id = v_existing_user AND is_active = true
    ) THEN
      RAISE EXCEPTION 'User is already an active member of this project'
        USING ERRCODE = 'unique_violation';
    END IF;

    -- If user exists but not member, add directly
    INSERT INTO public.project_members (project_id, user_id, role, is_active)
    VALUES (p_project_id, v_existing_user, p_role, true)
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET role = p_role, is_active = true;

    -- Audit
    INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
    VALUES (p_project_id, auth.uid(), 'project_members', v_existing_user, 'MEMBER_ADDED', 'settings',
            jsonb_build_object('email', p_email, 'role', p_role, 'method', 'direct'));

    RETURN jsonb_build_object('status', 'added_directly', 'user_id', v_existing_user);
  END IF;

  -- User doesn't exist yet — create invite
  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.project_invites (project_id, email, role, token, created_by)
  VALUES (p_project_id, lower(trim(p_email)), p_role, v_token, auth.uid())
  RETURNING id INTO v_invite_id;

  -- Audit
  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, auth.uid(), 'project_invites', v_invite_id, 'INVITE_CREATED', 'settings',
          jsonb_build_object('email', p_email, 'role', p_role));

  RETURN jsonb_build_object('status', 'invited', 'invite_id', v_invite_id, 'token', v_token);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. RPC: fn_accept_project_invite
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_accept_project_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite public.project_invites%ROWTYPE;
  v_user_email text;
BEGIN
  -- Get invite
  SELECT * INTO v_invite FROM public.project_invites WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite token';
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already accepted';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  -- Verify current user email matches invite
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  IF lower(v_user_email) != lower(v_invite.email) THEN
    RAISE EXCEPTION 'This invite was sent to a different email address';
  END IF;

  -- Add as project member
  INSERT INTO public.project_members (project_id, user_id, role, is_active)
  VALUES (v_invite.project_id, auth.uid(), v_invite.role, true)
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET role = v_invite.role, is_active = true;

  -- Mark invite as accepted
  UPDATE public.project_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  -- Audit
  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (v_invite.project_id, auth.uid(), 'project_members', auth.uid(), 'INVITE_ACCEPTED', 'settings',
          jsonb_build_object('role', v_invite.role));

  RETURN jsonb_build_object('status', 'accepted', 'project_id', v_invite.project_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. RPC: fn_list_my_projects  
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_list_my_projects()
RETURNS SETOF public.projects
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Super admin / tenant admin sees all
  IF public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'tenant_admin') THEN
    RETURN QUERY SELECT * FROM public.projects ORDER BY created_at DESC;
  END IF;

  -- Normal user: only projects where member OR creator
  RETURN QUERY
  SELECT p.* FROM public.projects p
  WHERE p.id IN (
    SELECT pm.project_id FROM public.project_members pm
    WHERE pm.user_id = auth.uid() AND pm.is_active = true
  )
  OR p.created_by = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. RPC: fn_update_member_role
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_update_member_role(
  p_project_id uuid,
  p_user_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_project_admin(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: must be project admin';
  END IF;

  -- Cannot demote yourself if you're the only admin
  IF p_user_id = auth.uid() AND p_new_role != 'admin' THEN
    IF (SELECT COUNT(*) FROM public.project_members WHERE project_id = p_project_id AND role = 'admin' AND is_active = true) <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin from the project';
    END IF;
  END IF;

  UPDATE public.project_members
  SET role = p_new_role
  WHERE project_id = p_project_id AND user_id = p_user_id;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, auth.uid(), 'project_members', p_user_id, 'ROLE_CHANGED', 'settings',
          jsonb_build_object('user_id', p_user_id, 'new_role', p_new_role));
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. RPC: fn_remove_project_member
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_remove_project_member(
  p_project_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_project_admin(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: must be project admin';
  END IF;

  -- Cannot remove yourself if you're the only admin
  IF p_user_id = auth.uid() THEN
    IF (SELECT COUNT(*) FROM public.project_members WHERE project_id = p_project_id AND role = 'admin' AND is_active = true) <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin from the project';
    END IF;
  END IF;

  UPDATE public.project_members
  SET is_active = false
  WHERE project_id = p_project_id AND user_id = p_user_id;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, auth.uid(), 'project_members', p_user_id, 'MEMBER_REMOVED', 'settings',
          jsonb_build_object('user_id', p_user_id));
END;
$$;
