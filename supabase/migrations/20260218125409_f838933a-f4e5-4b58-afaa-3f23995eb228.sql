
-- Migração incremental: adaptar attachments existente + novos recursos

-- 1. Adicionar coluna uploaded_by se não existir (alias de created_by para nova semântica)
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS uploaded_by uuid;

-- Preencher uploaded_by com created_by onde ainda não está preenchido
UPDATE public.attachments SET uploaded_by = created_by WHERE uploaded_by IS NULL AND created_by IS NOT NULL;

-- 2. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_attachments_entity
  ON public.attachments (project_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_attachments_created_at
  ON public.attachments (created_at);

-- 3. Bucket project-files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('project-files', 'project-files', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS para bucket project-files
DROP POLICY IF EXISTS "pf_select" ON storage.objects;
CREATE POLICY "pf_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND is_project_member(auth.uid(), split_part(name, '/', 1)::uuid)
  );

DROP POLICY IF EXISTS "pf_insert" ON storage.objects;
CREATE POLICY "pf_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND is_project_member(auth.uid(), split_part(name, '/', 1)::uuid)
  );

DROP POLICY IF EXISTS "pf_delete" ON storage.objects;
CREATE POLICY "pf_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND is_project_member(auth.uid(), split_part(name, '/', 1)::uuid)
  );

-- 5. Atualizar políticas RLS da tabela attachments para usar uploaded_by
DROP POLICY IF EXISTS "attachments_select" ON public.attachments;
CREATE POLICY "attachments_select" ON public.attachments
  FOR SELECT USING (is_project_member(auth.uid(), project_id));

DROP POLICY IF EXISTS "attachments_insert" ON public.attachments;
CREATE POLICY "attachments_insert" ON public.attachments
  FOR INSERT WITH CHECK (
    is_project_member(auth.uid(), project_id)
    AND (uploaded_by = auth.uid() OR uploaded_by IS NULL OR created_by = auth.uid() OR created_by IS NULL)
  );

DROP POLICY IF EXISTS "attachments_delete" ON public.attachments;
CREATE POLICY "attachments_delete" ON public.attachments
  FOR DELETE USING (
    COALESCE(uploaded_by, created_by) = auth.uid()
    OR is_project_admin(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "attachments_update" ON public.attachments;
-- sem UPDATE policy = bloqueado

-- 6. Coluna description no audit_log
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS description text;

-- 7. Campos NC para workflow completo
ALTER TABLE public.non_conformities ADD COLUMN IF NOT EXISTS root_cause text;
ALTER TABLE public.non_conformities ADD COLUMN IF NOT EXISTS corrective_action text;
ALTER TABLE public.non_conformities ADD COLUMN IF NOT EXISTS closure_date date;

-- 8. Coluna in_progress nos NC (status já é text, sem alteração de schema necessária)
-- Garantir que o status 'in_progress' é aceite (é text, ok)
