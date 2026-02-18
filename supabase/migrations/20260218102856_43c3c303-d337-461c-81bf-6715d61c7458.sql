
-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Add missing columns to projects
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS location   text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Add missing columns to documents
-- ──────────────────────────────────────────────────────────────────────────────
-- 'doc_type' is already the "type" column; rename not needed – keep existing.
-- Add: revision, file_url, created_by
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS revision   text,
  ADD COLUMN IF NOT EXISTS file_url   text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Add missing columns to suppliers
-- ──────────────────────────────────────────────────────────────────────────────
-- Existing: id, project_id, name, category, status, created_at, updated_at, contacts, nif_cif
-- Add: approval_status (map status → already present; add created_by)
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS created_by      uuid,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Create non_conformities table
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.non_conformities (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reference   text,
  description text        NOT NULL,
  severity    text        NOT NULL DEFAULT 'medium',
  status      text        NOT NULL DEFAULT 'open',
  responsible text,
  due_date    date,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;

-- Policies (mirror documents pattern)
CREATE POLICY "nc_select" ON public.non_conformities
  FOR SELECT USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "nc_insert" ON public.non_conformities
  FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "nc_update" ON public.non_conformities
  FOR UPDATE USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "nc_delete" ON public.non_conformities
  FOR DELETE USING (is_project_admin(auth.uid(), project_id));

-- updated_at trigger
CREATE TRIGGER update_non_conformities_updated_at
  BEFORE UPDATE ON public.non_conformities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Add module + performed_by to audit_log for richer logging
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS module       text,
  ADD COLUMN IF NOT EXISTS performed_by uuid;
