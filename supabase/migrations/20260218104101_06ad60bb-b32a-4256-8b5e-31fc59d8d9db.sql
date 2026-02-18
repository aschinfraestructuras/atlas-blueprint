
-- 1. Add missing columns to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client     text,
  ADD COLUMN IF NOT EXISTS start_date date;

-- 2. Self-service RLS: let any authenticated user create & own projects
--    (existing policies lock behind tenant_admin – add creator-based policies in parallel)

-- 2a. Creator can SELECT their own projects (supplements is_project_member)
CREATE POLICY "projects_select_creator"
  ON public.projects FOR SELECT
  USING (created_by = auth.uid());

-- 2b. Any authenticated user can INSERT a project (must set created_by = their uid)
CREATE POLICY "projects_insert_creator"
  ON public.projects FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 2c. Creator can UPDATE their own projects
CREATE POLICY "projects_update_creator"
  ON public.projects FOR UPDATE
  USING (created_by = auth.uid());

-- 2d. Creator can DELETE their own projects
CREATE POLICY "projects_delete_creator"
  ON public.projects FOR DELETE
  USING (created_by = auth.uid());
