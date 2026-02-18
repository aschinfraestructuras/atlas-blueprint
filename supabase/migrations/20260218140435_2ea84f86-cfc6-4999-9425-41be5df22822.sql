
-- ─── Remove duplicate / obsolete storage RLS policies ────────────────────────

-- Remove duplicates on qms-files (keep the qms_files_* set, drop the storage_* duplicates)
DROP POLICY IF EXISTS "storage_select_project_member" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_project_member" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_project_admin"  ON storage.objects;
DROP POLICY IF EXISTS "storage_update_project_member" ON storage.objects;

-- Remove obsolete project-files policies (bucket no longer used)
DROP POLICY IF EXISTS "pf_select" ON storage.objects;
DROP POLICY IF EXISTS "pf_insert" ON storage.objects;
DROP POLICY IF EXISTS "pf_delete" ON storage.objects;

-- Remove obsolete atlas_files policies (bucket no longer used)
DROP POLICY IF EXISTS "atlas_files_select" ON storage.objects;
DROP POLICY IF EXISTS "atlas_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "atlas_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "atlas_files_update" ON storage.objects;
