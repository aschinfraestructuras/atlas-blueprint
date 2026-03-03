
-- Fix search_path for newly created functions
CREATE OR REPLACE FUNCTION public.trg_validate_material_approval_status()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status NOT IN ('pending', 'submitted', 'in_review', 'approved', 'rejected', 'conditional', 'archived') THEN
    RAISE EXCEPTION 'Invalid approval_status: %', NEW.approval_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_validate_matdoc_status()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('valid', 'expired', 'pending', 'replaced') THEN
    RAISE EXCEPTION 'Invalid material_documents status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
