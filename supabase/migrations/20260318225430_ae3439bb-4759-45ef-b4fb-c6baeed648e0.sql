
-- Drop existing policies
DROP POLICY IF EXISTS "Members can view plan copies" ON public.plan_controlled_copies;
DROP POLICY IF EXISTS "Members can insert plan copies" ON public.plan_controlled_copies;
DROP POLICY IF EXISTS "Members can update plan copies" ON public.plan_controlled_copies;
DROP POLICY IF EXISTS "Admins can delete plan copies" ON public.plan_controlled_copies;

-- Recreate with (select auth.uid()) for performance
CREATE POLICY "Members can view plan copies" ON public.plan_controlled_copies
  FOR SELECT USING (
    public.is_project_member((select auth.uid()), project_id)
  );

CREATE POLICY "Members can insert plan copies" ON public.plan_controlled_copies
  FOR INSERT WITH CHECK (
    public.is_project_member((select auth.uid()), project_id)
  );

CREATE POLICY "Members can update plan copies" ON public.plan_controlled_copies
  FOR UPDATE USING (
    public.is_project_member((select auth.uid()), project_id)
  );

CREATE POLICY "Admins can delete plan copies" ON public.plan_controlled_copies
  FOR DELETE USING (
    public.is_project_admin((select auth.uid()), project_id)
  );
