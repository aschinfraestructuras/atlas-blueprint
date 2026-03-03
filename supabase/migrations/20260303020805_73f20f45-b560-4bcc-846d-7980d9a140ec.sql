
-- ═══════════════════════════════════════════════════════════════
-- Materials PRO: approval workflow columns + material_documents enhancements
-- ═══════════════════════════════════════════════════════════════

-- B1) Add approval columns to materials
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS current_approved_doc_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_id uuid;

-- Validation trigger for approval_status
CREATE OR REPLACE FUNCTION public.trg_validate_material_approval_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.approval_status NOT IN ('pending', 'submitted', 'in_review', 'approved', 'rejected', 'conditional', 'archived') THEN
    RAISE EXCEPTION 'Invalid approval_status: %', NEW.approval_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_material_approval_status ON public.materials;
CREATE TRIGGER validate_material_approval_status
  BEFORE INSERT OR UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_material_approval_status();

-- Indexes for approval workflow
CREATE INDEX IF NOT EXISTS idx_materials_approval_status ON public.materials(project_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON public.materials(supplier_id);

-- B2) Enhance material_documents with valid_from and status
ALTER TABLE public.material_documents
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'valid';

-- Validation trigger for material_documents status
CREATE OR REPLACE FUNCTION public.trg_validate_matdoc_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('valid', 'expired', 'pending', 'replaced') THEN
    RAISE EXCEPTION 'Invalid material_documents status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_matdoc_status ON public.material_documents;
CREATE TRIGGER validate_matdoc_status
  BEFORE INSERT OR UPDATE ON public.material_documents
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_matdoc_status();

CREATE INDEX IF NOT EXISTS idx_matdoc_valid_to ON public.material_documents(project_id, valid_to);
