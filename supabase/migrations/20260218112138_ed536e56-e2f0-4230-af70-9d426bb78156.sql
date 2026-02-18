
-- =================================================================
-- Storage RLS policies for 'qms-files' bucket
-- Path structure: {project_id}/{document_id}/{filename}
-- Access is gated on project membership via is_project_member().
-- The storage_path_project_id() function already validates the first
-- path segment as a real project UUID.
-- =================================================================

-- Drop any existing policies on storage.objects for this bucket
-- (safe to run even if they don't exist)
DROP POLICY IF EXISTS "qms_files_select" ON storage.objects;
DROP POLICY IF EXISTS "qms_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "qms_files_update" ON storage.objects;
DROP POLICY IF EXISTS "qms_files_delete" ON storage.objects;

-- SELECT: members can read/download files in their projects
CREATE POLICY "qms_files_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'qms-files'
  AND is_project_member(auth.uid(), storage_path_project_id(name))
);

-- INSERT: members can upload files to their projects
CREATE POLICY "qms_files_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'qms-files'
  AND is_project_member(auth.uid(), storage_path_project_id(name))
);

-- UPDATE: members can replace/overwrite files in their projects
CREATE POLICY "qms_files_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'qms-files'
  AND is_project_member(auth.uid(), storage_path_project_id(name))
);

-- DELETE: only project admins can delete files
CREATE POLICY "qms_files_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'qms-files'
  AND is_project_admin(auth.uid(), storage_path_project_id(name))
);
