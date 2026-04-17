
-- 1. Profiles INSERT policy (self only)
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- 2. Storage policies for atlas_files (project-member scoped, path = {project_id}/...)
DROP POLICY IF EXISTS "atlas_files_select_member" ON storage.objects;
CREATE POLICY "atlas_files_select_member"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'atlas_files'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.is_active = true
      AND (pm.project_id)::text = (string_to_array(name, '/'))[1]
  )
);

DROP POLICY IF EXISTS "atlas_files_insert_member" ON storage.objects;
CREATE POLICY "atlas_files_insert_member"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'atlas_files'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.is_active = true
      AND (pm.project_id)::text = (string_to_array(name, '/'))[1]
  )
);

DROP POLICY IF EXISTS "atlas_files_update_member" ON storage.objects;
CREATE POLICY "atlas_files_update_member"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'atlas_files'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.is_active = true
      AND (pm.project_id)::text = (string_to_array(name, '/'))[1]
  )
);

DROP POLICY IF EXISTS "atlas_files_delete_member" ON storage.objects;
CREATE POLICY "atlas_files_delete_member"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'atlas_files'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.is_active = true
      AND public.is_project_admin((SELECT auth.uid()), pm.project_id)
      AND (pm.project_id)::text = (string_to_array(name, '/'))[1]
  )
);

-- 3. Storage policies for project-files (same pattern)
DROP POLICY IF EXISTS "project_files_select_member" ON storage.objects;
CREATE POLICY "project_files_select_member"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.is_active = true
      AND (pm.project_id)::text = (string_to_array(name, '/'))[1]
  )
);

DROP POLICY IF EXISTS "project_files_insert_member" ON storage.objects;
CREATE POLICY "project_files_insert_member"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.is_active = true
      AND (pm.project_id)::text = (string_to_array(name, '/'))[1]
  )
);

DROP POLICY IF EXISTS "project_files_update_member" ON storage.objects;
CREATE POLICY "project_files_update_member"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.is_active = true
      AND (pm.project_id)::text = (string_to_array(name, '/'))[1]
  )
);

DROP POLICY IF EXISTS "project_files_delete_member" ON storage.objects;
CREATE POLICY "project_files_delete_member"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.is_active = true
      AND public.is_project_admin((SELECT auth.uid()), pm.project_id)
      AND (pm.project_id)::text = (string_to_array(name, '/'))[1]
  )
);

-- 4. Realtime: require authenticated subscriber (no public broadcast)
DROP POLICY IF EXISTS "realtime_authenticated_only" ON realtime.messages;
CREATE POLICY "realtime_authenticated_only"
ON realtime.messages
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);
