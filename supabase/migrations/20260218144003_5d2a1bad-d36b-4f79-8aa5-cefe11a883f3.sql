
-- ─── Storage Policies: qms-files bucket ──────────────────────────────────────
-- Drop any existing policies to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END;
$$;

-- SELECT: authenticated users can read objects in qms-files
-- (path must start with a valid project the user is a member of)
CREATE POLICY "qms_files_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'qms-files'
    AND is_project_member(
      auth.uid(),
      storage_path_project_id(name)
    )
  );

-- INSERT: authenticated members can upload
CREATE POLICY "qms_files_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'qms-files'
    AND is_project_member(
      auth.uid(),
      storage_path_project_id(name)
    )
  );

-- UPDATE: members can update (upsert scenarios)
CREATE POLICY "qms_files_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'qms-files'
    AND is_project_member(
      auth.uid(),
      storage_path_project_id(name)
    )
  );

-- DELETE: project admins can delete
CREATE POLICY "qms_files_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'qms-files'
    AND is_project_admin(
      auth.uid(),
      storage_path_project_id(name)
    )
  );
