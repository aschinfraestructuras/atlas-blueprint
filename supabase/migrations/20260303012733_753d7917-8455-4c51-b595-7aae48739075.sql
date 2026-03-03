
-- ═══════════════════════════════════════════════════════════════════
-- Platform Consolidation: Soft Delete columns for all core modules
-- ═══════════════════════════════════════════════════════════════════

-- 1) work_items
ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 2) non_conformities
ALTER TABLE public.non_conformities
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 3) ppi_instances
ALTER TABLE public.ppi_instances
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 4) test_results
ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 5) materials
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 6) suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 7) subcontractors
ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- ═══════════════════════════════════════════════════════════════════
-- Performance indexes for soft-delete filtering
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_work_items_not_deleted ON public.work_items (project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_nc_not_deleted ON public.non_conformities (project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ppi_not_deleted ON public.ppi_instances (project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_test_results_not_deleted ON public.test_results (project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_materials_not_deleted ON public.materials (project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_suppliers_not_deleted ON public.suppliers (project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_subcontractors_not_deleted ON public.subcontractors (project_id) WHERE is_deleted = false;
