
-- ============================================================
-- QMS SCHEMA — Full migration
-- Depends on: existing profiles, tenants, user_roles, app_role
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. ALTER existing profiles to add email & phone if missing
--    (the existing table has user_id as the auth link; we keep that)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email  text,
  ADD COLUMN IF NOT EXISTS phone  text;

-- ─────────────────────────────────────────────────────────────
-- 1. ROLES lookup table  (code PK, name)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  code text PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO public.roles (code, name) VALUES
  ('admin',           'Project Administrator'),
  ('quality_manager', 'Quality Manager'),
  ('quality_tech',    'Quality Technician'),
  ('site_manager',    'Site Manager'),
  ('lab_tech',        'Lab Technician'),
  ('surveyor',        'Surveyor'),
  ('inspector',       'Inspector / Client'),
  ('viewer',          'Viewer (read-only)')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. PROJECTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text        NOT NULL UNIQUE,
  name       text        NOT NULL,
  status     text        NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','inactive','completed','archived')),
  tenant_id  uuid        REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 3. PROJECT_MEMBERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL,
  role       text        NOT NULL REFERENCES public.roles(code),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 4. AUDIT_LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         bigserial   PRIMARY KEY,
  project_id uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id    uuid,
  entity     text        NOT NULL,
  entity_id  uuid,
  action     text        NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  diff       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 5. DOCUMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  doc_type   text        NOT NULL,
  status     text        NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','review','approved','obsolete')),
  version    text        NOT NULL DEFAULT '1.0',
  issued_at  date,
  tags       text[]      DEFAULT '{}',
  created_by uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 6. DOCUMENT_FILES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_files (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id    uuid        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  storage_bucket text        NOT NULL DEFAULT 'qms-files',
  storage_path   text        NOT NULL,
  file_name      text        NOT NULL,
  mime_type      text,
  size           bigint,
  sha256         text,
  uploaded_by    uuid        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 7. SUPPLIERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  nif_cif    text,
  category   text,
  status     text        NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','inactive','suspended')),
  contacts   jsonb       DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 8. TESTS_CATALOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tests_catalog (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code                text        NOT NULL,
  name                text        NOT NULL,
  standard            text,
  frequency           text,
  acceptance_criteria text,
  active              boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, code)
);

ALTER TABLE public.tests_catalog ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 9. TEST_RESULTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.test_results (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  test_id     uuid        NOT NULL REFERENCES public.tests_catalog(id),
  supplier_id uuid        REFERENCES public.suppliers(id) ON DELETE SET NULL,
  sample_ref  text,
  location    text,
  date        date        NOT NULL DEFAULT CURRENT_DATE,
  result      jsonb       DEFAULT '{}',
  status      text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','pass','fail','inconclusive')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 10. INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_project_members_user_id   ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id       ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_document_files_document_id ON public.document_files(document_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_project_id       ON public.suppliers(project_id);
CREATE INDEX IF NOT EXISTS idx_tests_catalog_project_id   ON public.tests_catalog(project_id);
CREATE INDEX IF NOT EXISTS idx_test_results_project_id    ON public.test_results(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_project_id       ON public.audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity           ON public.audit_log(entity, entity_id);

-- ─────────────────────────────────────────────────────────────
-- 11. HELPER SECURITY-DEFINER FUNCTIONS (no RLS recursion)
-- ─────────────────────────────────────────────────────────────

-- Check if current user is a member of a project
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  );
$$;

-- Get the role of current user in a project
CREATE OR REPLACE FUNCTION public.get_project_role(_user_id uuid, _project_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.project_members
  WHERE user_id = _user_id AND project_id = _project_id
  LIMIT 1;
$$;

-- Check if current user is admin of a project
CREATE OR REPLACE FUNCTION public.is_project_admin(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id AND role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 12. RLS POLICIES
-- ─────────────────────────────────────────────────────────────

-- ── profiles (own row only) ──────────────────────────────────
-- (existing policies kept; nothing to add)

-- ── roles (public read, no write from client) ────────────────
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_all"
  ON public.roles FOR SELECT TO authenticated
  USING (true);

-- ── projects ─────────────────────────────────────────────────
CREATE POLICY "projects_select_member"
  ON public.projects FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), id));

CREATE POLICY "projects_insert_tenant_admin"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "projects_update_admin"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    public.is_project_admin(auth.uid(), id)
    OR has_role(auth.uid(), 'tenant_admin')
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "projects_delete_tenant_admin"
  ON public.projects FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin')
  );

-- ── project_members ──────────────────────────────────────────
CREATE POLICY "pm_select_member"
  ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "pm_insert_project_admin"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_project_admin(auth.uid(), project_id)
    OR has_role(auth.uid(), 'tenant_admin')
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "pm_update_project_admin"
  ON public.project_members FOR UPDATE TO authenticated
  USING (
    public.is_project_admin(auth.uid(), project_id)
    OR has_role(auth.uid(), 'tenant_admin')
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "pm_delete_project_admin"
  ON public.project_members FOR DELETE TO authenticated
  USING (
    public.is_project_admin(auth.uid(), project_id)
    OR has_role(auth.uid(), 'tenant_admin')
    OR has_role(auth.uid(), 'super_admin')
  );

-- ── audit_log ────────────────────────────────────────────────
CREATE POLICY "audit_log_select_member"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

-- Audit log is written by server-side triggers only (no direct client insert)
CREATE POLICY "audit_log_insert_authenticated"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── Macro: business table RLS factory ────────────────────────
-- documents
CREATE POLICY "documents_select"   ON public.documents FOR SELECT   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "documents_insert"   ON public.documents FOR INSERT   TO authenticated WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "documents_update"   ON public.documents FOR UPDATE   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "documents_delete"   ON public.documents FOR DELETE   TO authenticated USING      (public.is_project_admin(auth.uid(), project_id));

-- document_files
CREATE POLICY "doc_files_select"   ON public.document_files FOR SELECT   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "doc_files_insert"   ON public.document_files FOR INSERT   TO authenticated WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "doc_files_update"   ON public.document_files FOR UPDATE   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "doc_files_delete"   ON public.document_files FOR DELETE   TO authenticated USING      (public.is_project_admin(auth.uid(), project_id));

-- suppliers
CREATE POLICY "suppliers_select"   ON public.suppliers FOR SELECT   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "suppliers_insert"   ON public.suppliers FOR INSERT   TO authenticated WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "suppliers_update"   ON public.suppliers FOR UPDATE   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "suppliers_delete"   ON public.suppliers FOR DELETE   TO authenticated USING      (public.is_project_admin(auth.uid(), project_id));

-- tests_catalog
CREATE POLICY "tests_cat_select"   ON public.tests_catalog FOR SELECT   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "tests_cat_insert"   ON public.tests_catalog FOR INSERT   TO authenticated WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "tests_cat_update"   ON public.tests_catalog FOR UPDATE   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "tests_cat_delete"   ON public.tests_catalog FOR DELETE   TO authenticated USING      (public.is_project_admin(auth.uid(), project_id));

-- test_results
CREATE POLICY "test_res_select"    ON public.test_results FOR SELECT   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "test_res_insert"    ON public.test_results FOR INSERT   TO authenticated WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "test_res_update"    ON public.test_results FOR UPDATE   TO authenticated USING      (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "test_res_delete"    ON public.test_results FOR DELETE   TO authenticated USING      (public.is_project_admin(auth.uid(), project_id));

-- ─────────────────────────────────────────────────────────────
-- 13. updated_at TRIGGERS
-- ─────────────────────────────────────────────────────────────
-- Reuse existing update_updated_at_column() function

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tests_catalog_updated_at
  BEFORE UPDATE ON public.tests_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_test_results_updated_at
  BEFORE UPDATE ON public.test_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 14. AUDIT LOG — helper function + triggers
-- ─────────────────────────────────────────────────────────────

-- Callable helper (can also be called manually from app code)
CREATE OR REPLACE FUNCTION public.log_audit(
  _project_id uuid,
  _entity      text,
  _entity_id   uuid,
  _action      text,
  _diff        jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (project_id, user_id, entity, entity_id, action, diff)
  VALUES (_project_id, auth.uid(), _entity, _entity_id, _action, _diff);
END;
$$;

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _diff   jsonb;
  _entity text := TG_TABLE_NAME;
  _id     uuid;
  _proj   uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _id   := NEW.id;
    _proj := NEW.project_id;
    _diff := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    _id   := NEW.id;
    _proj := NEW.project_id;
    _diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    _id   := OLD.id;
    _proj := OLD.project_id;
    _diff := to_jsonb(OLD);
  END IF;

  INSERT INTO public.audit_log (project_id, user_id, entity, entity_id, action, diff)
  VALUES (_proj, auth.uid(), _entity, _id, TG_OP, _diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit triggers to auditable tables
CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_tests_catalog
  AFTER INSERT OR UPDATE OR DELETE ON public.tests_catalog
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_test_results
  AFTER INSERT OR UPDATE OR DELETE ON public.test_results
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ─────────────────────────────────────────────────────────────
-- 15. STORAGE — qms-files bucket + RLS
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qms-files',
  'qms-files',
  false,
  52428800,   -- 50 MB max per file
  ARRAY[
    'application/pdf',
    'image/jpeg','image/png','image/webp','image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Helper: extract project_id from storage path  (first segment)
CREATE OR REPLACE FUNCTION public.storage_path_project_id(path text)
RETURNS uuid
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (string_to_array(path, '/'))[1]::uuid;
$$;

-- SELECT: authenticated users can read objects in their projects
CREATE POLICY "storage_select_project_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'qms-files'
    AND public.is_project_member(
          auth.uid(),
          public.storage_path_project_id(name)
        )
  );

-- INSERT: members can upload to their project folder
CREATE POLICY "storage_insert_project_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qms-files'
    AND public.is_project_member(
          auth.uid(),
          public.storage_path_project_id(name)
        )
  );

-- UPDATE: members can update objects in their project folder
CREATE POLICY "storage_update_project_member"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'qms-files'
    AND public.is_project_member(
          auth.uid(),
          public.storage_path_project_id(name)
        )
  );

-- DELETE: only project admins can delete files
CREATE POLICY "storage_delete_project_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'qms-files'
    AND public.is_project_admin(
          auth.uid(),
          public.storage_path_project_id(name)
        )
  );
