
-- =============================================================================
-- PPI Schema Hardening — Part 2 (remainder after partial first run)
-- Applying: disciplina_outro columns + work_items RLS hardening
-- =============================================================================

-- ─── 1. DISCIPLINA_OUTRO columns ─────────────────────────────────────────────
ALTER TABLE public.ppi_templates
  ADD COLUMN IF NOT EXISTS disciplina_outro TEXT;

ALTER TABLE public.ppi_instances
  ADD COLUMN IF NOT EXISTS disciplina_outro TEXT;

COMMENT ON COLUMN public.ppi_templates.disciplina_outro IS
  'Free-text discipline label, only used when disciplina = ''outros''';
COMMENT ON COLUMN public.ppi_instances.disciplina_outro IS
  'Free-text discipline label, only used when disciplina = ''outros''';

-- ─── 2. FIX work_items RLS ───────────────────────────────────────────────────
-- Remove the overly permissive USING(true) policies
DROP POLICY IF EXISTS work_items_select_all  ON public.work_items;
DROP POLICY IF EXISTS work_items_insert_all  ON public.work_items;
DROP POLICY IF EXISTS work_items_update_all  ON public.work_items;
DROP POLICY IF EXISTS work_items_delete_all  ON public.work_items;

-- Also drop new ones in case of partial apply
DROP POLICY IF EXISTS work_items_select ON public.work_items;
DROP POLICY IF EXISTS work_items_insert ON public.work_items;
DROP POLICY IF EXISTS work_items_update ON public.work_items;
DROP POLICY IF EXISTS work_items_delete ON public.work_items;

-- SELECT: project members can read
CREATE POLICY work_items_select ON public.work_items
  FOR SELECT USING (is_project_member(auth.uid(), project_id));

-- INSERT: project members can create
CREATE POLICY work_items_insert ON public.work_items
  FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));

-- UPDATE: project members can update
CREATE POLICY work_items_update ON public.work_items
  FOR UPDATE USING (is_project_member(auth.uid(), project_id));

-- DELETE: project admins only
CREATE POLICY work_items_delete ON public.work_items
  FOR DELETE USING (is_project_admin(auth.uid(), project_id));

-- ─── 3. VERIFY ───────────────────────────────────────────────────────────────
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('ppi_templates','ppi_instances')
    AND column_name = 'disciplina_outro';
  ASSERT v_count = 2, 'FAIL: disciplina_outro columns missing (' || v_count || '/2)';

  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'work_items'
    AND policyname IN ('work_items_select','work_items_insert','work_items_update','work_items_delete');
  ASSERT v_count = 4, 'FAIL: work_items RLS policies missing (' || v_count || '/4)';

  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'work_items'
    AND policyname LIKE '%_all';
  ASSERT v_count = 0, 'FAIL: old permissive work_items policies still exist (' || v_count || ')';

  RAISE NOTICE '✅ Part 2 verified: disciplina_outro columns added, work_items RLS hardened';
END $$;
