
-- ═══════════════════════════════════════════════════════════════════════════════
-- Subcontractors: add fields for documentation, performance, contract
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS contract text,
  ADD COLUMN IF NOT EXISTS documentation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS performance_score numeric;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Subcontractor mandatory documents table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.subcontractor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  subcontractor_id uuid NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  document_id uuid REFERENCES public.documents(id),
  valid_from date,
  valid_to date,
  status text NOT NULL DEFAULT 'valid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subdoc_select" ON public.subcontractor_documents FOR SELECT
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "subdoc_insert" ON public.subcontractor_documents FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "subdoc_update" ON public.subcontractor_documents FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "subdoc_delete" ON public.subcontractor_documents FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));

-- ═══════════════════════════════════════════════════════════════════════════════
-- Trigger: block assigning subcontractor with expired docs to new activities
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_check_subcontractor_docs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count int;
  v_doc_status text;
BEGIN
  -- Only check when subcontractor_id is being set or changed
  IF NEW.subcontractor_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Skip if not a new assignment (on update, only check if subcontractor changed)
  IF TG_OP = 'UPDATE' AND OLD.subcontractor_id = NEW.subcontractor_id THEN
    RETURN NEW;
  END IF;

  -- Check subcontractor documentation_status
  SELECT documentation_status INTO v_doc_status
  FROM subcontractors WHERE id = NEW.subcontractor_id;
  
  IF v_doc_status = 'expired' THEN
    RAISE EXCEPTION 'Subempreiteiro com documentação expirada. Atualize a documentação antes de atribuir a novas atividades.';
  END IF;

  -- Also check if any mandatory docs are expired
  SELECT count(*) INTO v_expired_count
  FROM subcontractor_documents
  WHERE subcontractor_id = NEW.subcontractor_id
    AND valid_to IS NOT NULL
    AND valid_to < CURRENT_DATE;

  IF v_expired_count > 0 THEN
    RAISE EXCEPTION 'Subempreiteiro tem % documento(s) expirado(s). Atualize antes de atribuir.', v_expired_count;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_sub_docs_on_activity
  BEFORE INSERT OR UPDATE ON public.planning_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_subcontractor_docs();
