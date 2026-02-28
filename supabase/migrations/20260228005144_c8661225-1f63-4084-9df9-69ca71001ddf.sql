
-- Fix suppliers SELECT policy: all project members should see suppliers (not just admin/PM/QM)
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers
  FOR SELECT USING (is_project_member(auth.uid(), project_id));
