
-- ============================================================
-- FASE 1: Módulo Documentos Avançado — Schema Migration
-- ============================================================

-- 1) Drop old CHECK constraint on documents.status if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'documents' AND constraint_type = 'CHECK'
      AND constraint_name = 'documents_status_check'
  ) THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_status_check;
  END IF;
END $$;

-- 2) Add new columns to documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type_outro text,
  ADD COLUMN IF NOT EXISTS disciplina text NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS disciplina_outro text,
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- 3) Add new CHECK constraint for extended status set
ALTER TABLE public.documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN ('draft', 'in_review', 'approved', 'obsolete', 'archived'));

-- Migrate existing 'review' status to 'in_review'
UPDATE public.documents SET status = 'in_review' WHERE status = 'review';

-- 4) Create document_versions table
CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  file_path text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  change_description text,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true,
  UNIQUE (document_id, version_number)
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- RLS for document_versions (via parent document project membership)
CREATE POLICY "doc_ver_select" ON public.document_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
      AND is_project_member(auth.uid(), d.project_id)
  ));

CREATE POLICY "doc_ver_insert" ON public.document_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
      AND is_project_member(auth.uid(), d.project_id)
  ));

CREATE POLICY "doc_ver_update" ON public.document_versions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
      AND is_project_member(auth.uid(), d.project_id)
  ));

CREATE POLICY "doc_ver_delete" ON public.document_versions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
      AND is_project_admin(auth.uid(), d.project_id)
  ));

-- 5) Create document_links table
CREATE TABLE IF NOT EXISTS public.document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  linked_entity_type text NOT NULL,
  linked_entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (document_id, linked_entity_type, linked_entity_id)
);

ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_link_select" ON public.document_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_links.document_id
      AND is_project_member(auth.uid(), d.project_id)
  ));

CREATE POLICY "doc_link_insert" ON public.document_links FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_links.document_id
      AND is_project_member(auth.uid(), d.project_id)
  ));

CREATE POLICY "doc_link_delete" ON public.document_links FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_links.document_id
      AND is_project_member(auth.uid(), d.project_id)
  ));

-- 6) FK for current_version_id (deferred since versions are created after document)
ALTER TABLE public.documents
  ADD CONSTRAINT documents_current_version_id_fkey
  FOREIGN KEY (current_version_id) REFERENCES public.document_versions(id)
  ON DELETE SET NULL;

-- 7) Index for performance
CREATE INDEX IF NOT EXISTS idx_documents_project_status ON public.documents(project_id, status) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_links_document ON public.document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_links_entity ON public.document_links(linked_entity_type, linked_entity_id);

-- 8) Auto-generate document code: fn_create_document
CREATE OR REPLACE FUNCTION public.fn_create_document(
  p_project_id uuid,
  p_title text,
  p_doc_type text,
  p_type_outro text DEFAULT NULL,
  p_disciplina text DEFAULT 'geral',
  p_disciplina_outro text DEFAULT NULL,
  p_revision text DEFAULT '0',
  p_status text DEFAULT 'draft'
)
RETURNS public.documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_proj_code text;
  v_seq int;
  v_code text;
  v_result public.documents;
BEGIN
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  SELECT code INTO v_proj_code FROM public.projects WHERE id = p_project_id;

  -- Sequential code: DOC-<PROJECT>-0001
  SELECT COALESCE(MAX(
    CASE WHEN d.code ~ ('^DOC-' || v_proj_code || '-[0-9]{4,}$')
    THEN substring(d.code FROM length('DOC-' || v_proj_code || '-') + 1)::int
    ELSE 0 END
  ), 0) + 1
  INTO v_seq
  FROM public.documents d
  WHERE d.project_id = p_project_id;

  v_code := 'DOC-' || v_proj_code || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.documents (
    project_id, code, title, doc_type, type_outro,
    disciplina, disciplina_outro, revision, status,
    created_by, updated_by
  ) VALUES (
    p_project_id, v_code, p_title, p_doc_type, p_type_outro,
    p_disciplina, p_disciplina_outro, p_revision, p_status,
    auth.uid(), auth.uid()
  )
  RETURNING * INTO v_result;

  -- Audit
  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, auth.uid(), 'documents', v_result.id, 'INSERT', 'documents',
          jsonb_build_object('code', v_code, 'title', p_title, 'doc_type', p_doc_type));

  RETURN v_result;
END;
$$;

-- 9) Create new version RPC
CREATE OR REPLACE FUNCTION public.fn_create_new_version(
  p_document_id uuid,
  p_file_path text,
  p_file_name text DEFAULT NULL,
  p_file_size bigint DEFAULT NULL,
  p_mime_type text DEFAULT NULL,
  p_change_description text DEFAULT NULL
)
RETURNS public.document_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doc public.documents;
  v_next_ver int;
  v_version public.document_versions;
BEGIN
  SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found'; END IF;

  IF NOT public.is_project_member(auth.uid(), v_doc.project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Mark all existing versions as not current
  UPDATE public.document_versions
  SET is_current = false
  WHERE document_id = p_document_id;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_ver
  FROM public.document_versions
  WHERE document_id = p_document_id;

  -- Insert new version
  INSERT INTO public.document_versions (
    document_id, version_number, file_path, file_name, file_size,
    mime_type, change_description, uploaded_by, is_current
  ) VALUES (
    p_document_id, v_next_ver, p_file_path, p_file_name, p_file_size,
    p_mime_type, p_change_description, auth.uid(), true
  )
  RETURNING * INTO v_version;

  -- Update document to point to current version
  UPDATE public.documents
  SET current_version_id = v_version.id,
      file_path = p_file_path,
      file_name = p_file_name,
      file_size = p_file_size,
      mime_type = p_mime_type,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_document_id;

  -- Audit
  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (v_doc.project_id, auth.uid(), 'documents', p_document_id, 'NEW_VERSION', 'documents',
          jsonb_build_object('version', v_next_ver, 'file_name', p_file_name, 'change', p_change_description));

  RETURN v_version;
END;
$$;

-- 10) Backfill codes for existing documents that have no code
DO $$
DECLARE
  r RECORD;
  v_proj_code text;
  v_seq int;
BEGIN
  FOR r IN
    SELECT d.id, d.project_id
    FROM public.documents d
    WHERE d.code IS NULL
    ORDER BY d.created_at
  LOOP
    SELECT code INTO v_proj_code FROM public.projects WHERE id = r.project_id;

    SELECT COALESCE(MAX(
      CASE WHEN d2.code ~ ('^DOC-' || v_proj_code || '-[0-9]{4,}$')
      THEN substring(d2.code FROM length('DOC-' || v_proj_code || '-') + 1)::int
      ELSE 0 END
    ), 0) + 1
    INTO v_seq
    FROM public.documents d2
    WHERE d2.project_id = r.project_id;

    UPDATE public.documents SET code = 'DOC-' || v_proj_code || '-' || lpad(v_seq::text, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;
