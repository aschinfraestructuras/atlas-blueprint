
-- ═══════════════════════════════════════════════════════════════════════════════
-- QUALITY CONTROL NORMALIZATION MIGRATION
-- Phase: Structural normalization without data loss
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1️⃣ TEST RESULTS: Separate workflow from technical result ───────────────

-- Add new workflow status column
ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS status_workflow text NOT NULL DEFAULT 'draft';

-- Add new technical result column
ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS result_status text;

-- Migrate existing data: technical outcomes → result_status
UPDATE public.test_results
SET result_status = status,
    status_workflow = 'submitted'
WHERE status IN ('pass', 'fail', 'inconclusive');

-- Migrate existing data: workflow states → status_workflow
UPDATE public.test_results
SET status_workflow = CASE status
      WHEN 'draft'       THEN 'draft'
      WHEN 'pending'     THEN 'draft'
      WHEN 'in_progress' THEN 'in_progress'
      WHEN 'completed'   THEN 'submitted'
      WHEN 'approved'    THEN 'approved'
      WHEN 'archived'    THEN 'archived'
      ELSE 'draft'
    END
WHERE status NOT IN ('pass', 'fail', 'inconclusive');

-- Add CHECK constraints on new columns
ALTER TABLE public.test_results
  ADD CONSTRAINT chk_test_results_status_workflow
    CHECK (status_workflow IN ('draft', 'in_progress', 'submitted', 'reviewed', 'approved', 'archived'));

ALTER TABLE public.test_results
  ADD CONSTRAINT chk_test_results_result_status
    CHECK (result_status IS NULL OR result_status IN ('pass', 'fail', 'inconclusive', 'na'));

-- Add comment marking original column as deprecated
COMMENT ON COLUMN public.test_results.status IS 'DEPRECATED – use status_workflow and result_status instead';
COMMENT ON COLUMN public.test_results.pass_fail IS 'DEPRECATED – use result_status instead';

-- ─── 2️⃣ PPI INSTANCE ITEMS: Standardize result values ──────────────────────

-- First migrate data
UPDATE public.ppi_instance_items SET result = 'pass' WHERE result = 'ok';
UPDATE public.ppi_instance_items SET result = 'fail' WHERE result = 'nok';

-- Drop old constraint if exists, then add new one
ALTER TABLE public.ppi_instance_items
  DROP CONSTRAINT IF EXISTS ppi_instance_items_result_check;

ALTER TABLE public.ppi_instance_items
  ADD CONSTRAINT chk_ppi_items_result
    CHECK (result IN ('pending', 'pass', 'fail', 'na'));

-- ─── 3️⃣ TEST CATALOG: Structured frequency model ───────────────────────────

ALTER TABLE public.tests_catalog
  ADD COLUMN IF NOT EXISTS frequency_type text;

ALTER TABLE public.tests_catalog
  ADD COLUMN IF NOT EXISTS frequency_value numeric;

ALTER TABLE public.tests_catalog
  ADD COLUMN IF NOT EXISTS frequency_unit text;

ALTER TABLE public.tests_catalog
  ADD CONSTRAINT chk_catalog_frequency_type
    CHECK (frequency_type IS NULL OR frequency_type IN (
      'per_volume', 'per_layer', 'per_lot', 'per_day', 'fixed_number', 'manual'
    ));

COMMENT ON COLUMN public.tests_catalog.frequency IS 'DEPRECATED – use frequency_type, frequency_value, frequency_unit instead';

-- ─── 4️⃣ VALIDATION HARDENING ───────────────────────────────────────────────

-- Cannot approve test_results without a result_status
CREATE OR REPLACE FUNCTION public.trg_validate_test_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Block approval without technical result
  IF NEW.status_workflow = 'approved' AND NEW.result_status IS NULL THEN
    RAISE EXCEPTION 'Cannot approve test result without a technical result (pass/fail/inconclusive/na)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_test_approval ON public.test_results;
CREATE TRIGGER trg_validate_test_approval
  BEFORE INSERT OR UPDATE ON public.test_results
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validate_test_approval();

-- PPI items: cannot mark pass/fail without checked_by and checked_at
CREATE OR REPLACE FUNCTION public.trg_validate_ppi_item_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.result IN ('pass', 'fail') AND (NEW.checked_by IS NULL OR NEW.checked_at IS NULL) THEN
    RAISE EXCEPTION 'Cannot mark PPI item as pass/fail without checked_by and checked_at'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ppi_item_check ON public.ppi_instance_items;
CREATE TRIGGER trg_validate_ppi_item_check
  BEFORE INSERT OR UPDATE ON public.ppi_instance_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validate_ppi_item_check();

-- ─── 5️⃣ WORK ITEMS: Readiness fields for future blocking engine ────────────

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS has_open_nc boolean NOT NULL DEFAULT false;

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS has_pending_ppi boolean NOT NULL DEFAULT false;

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS has_pending_tests boolean NOT NULL DEFAULT false;

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS readiness_status text NOT NULL DEFAULT 'not_ready';

ALTER TABLE public.work_items
  ADD CONSTRAINT chk_work_items_readiness
    CHECK (readiness_status IN ('ready', 'not_ready', 'blocked'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES for new columns
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_test_results_status_workflow ON public.test_results (status_workflow);
CREATE INDEX IF NOT EXISTS idx_test_results_result_status ON public.test_results (result_status);
CREATE INDEX IF NOT EXISTS idx_work_items_readiness ON public.work_items (readiness_status);
