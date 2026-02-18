
-- ─────────────────────────────────────────────────
-- 1. Adicionar colunas em falta à tabela documents
-- ─────────────────────────────────────────────────
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_path   text,
  ADD COLUMN IF NOT EXISTS file_name   text,
  ADD COLUMN IF NOT EXISTS file_size   bigint,
  ADD COLUMN IF NOT EXISTS mime_type   text;

-- Migrar registos existentes: se file_url contiver um storage path
-- (não começa com http), copiar para file_path e limpar file_url
UPDATE public.documents
SET
  file_path = file_url,
  file_url  = NULL
WHERE file_url IS NOT NULL
  AND file_url NOT LIKE 'http%';

-- ─────────────────────────────────────────────────
-- 2. Bucket atlas_files (privado)
-- ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'atlas_files',
  'atlas_files',
  false,
  52428800,   -- 50 MB
  NULL        -- aceitar todos os tipos
)
ON CONFLICT (id) DO UPDATE
  SET public = false;

-- ─────────────────────────────────────────────────
-- 3. RLS Storage — atlas_files
--    Política: utilizadores membros do projeto cujo UUID
--    corresponde ao primeiro segmento do path.
-- ─────────────────────────────────────────────────

-- SELECT (download / signed URL)
DROP POLICY IF EXISTS "atlas_files_select" ON storage.objects;
CREATE POLICY "atlas_files_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'atlas_files'
  AND auth.role() = 'authenticated'
  AND public.is_project_member(
    auth.uid(),
    (split_part(name, '/', 2))::uuid
  )
);

-- INSERT (upload)
DROP POLICY IF EXISTS "atlas_files_insert" ON storage.objects;
CREATE POLICY "atlas_files_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'atlas_files'
  AND auth.role() = 'authenticated'
  AND public.is_project_member(
    auth.uid(),
    (split_part(name, '/', 2))::uuid
  )
);

-- UPDATE (upsert / overwrite)
DROP POLICY IF EXISTS "atlas_files_update" ON storage.objects;
CREATE POLICY "atlas_files_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'atlas_files'
  AND auth.role() = 'authenticated'
  AND public.is_project_member(
    auth.uid(),
    (split_part(name, '/', 2))::uuid
  )
);

-- DELETE (apenas admins do projeto)
DROP POLICY IF EXISTS "atlas_files_delete" ON storage.objects;
CREATE POLICY "atlas_files_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'atlas_files'
  AND auth.role() = 'authenticated'
  AND public.is_project_admin(
    auth.uid(),
    (split_part(name, '/', 2))::uuid
  )
);
