
-- ============================================================
-- FIX 1: Backfill project_members for existing projects
-- Insert the project creator as 'admin' member for all existing
-- projects that don't already have a membership row.
-- ============================================================
INSERT INTO public.project_members (project_id, user_id, role)
SELECT p.id, p.created_by, 'admin'
FROM public.projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = p.id AND pm.user_id = p.created_by
  );

-- ============================================================
-- FIX 2: Trigger to auto-insert creator into project_members
-- on every future INSERT into projects.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_add_creator_as_project_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_creator_as_project_admin ON public.projects;
CREATE TRIGGER trg_add_creator_as_project_admin
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.fn_add_creator_as_project_admin();

-- ============================================================
-- FIX 3: Ensure project_members has unique constraint
-- (it may already exist; ON CONFLICT handles it above,
--  but explicit constraint ensures DB integrity)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_members_project_id_user_id_key'
      AND conrelid = 'public.project_members'::regclass
  ) THEN
    ALTER TABLE public.project_members
      ADD CONSTRAINT project_members_project_id_user_id_key
      UNIQUE (project_id, user_id);
  END IF;
END;
$$;

-- ============================================================
-- FIX 4: Ensure audit_log INSERT policy allows authenticated users
-- (current policy: WITH CHECK user_id = auth.uid() — correct,
--  but also needs to allow when user is project member)
-- ============================================================
-- No change needed for audit_log INSERT — it already uses user_id = auth.uid()

-- ============================================================
-- FIX 5: Re-check suppliers SELECT policy — it restricts to
-- specific roles (admin, project_manager, quality_manager).
-- A regular 'admin' role in project_members should match.
-- The is_project_admin function checks role='admin' — correct.
-- suppliers_select already checks:
--   is_project_member AND get_project_role IN ('admin','project_manager','quality_manager')
-- Since we insert role='admin', this will now work.
-- ============================================================

-- Verify backfill worked (informational only)
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.project_members;
  RAISE NOTICE 'project_members row count after backfill: %', v_count;
END;
$$;
