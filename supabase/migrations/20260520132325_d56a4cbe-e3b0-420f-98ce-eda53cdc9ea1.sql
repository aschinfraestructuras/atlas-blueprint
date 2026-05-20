DROP POLICY IF EXISTS "Admins and managers can insert map layers" ON public.project_map_layers;
DROP POLICY IF EXISTS "Admins and managers can update map layers" ON public.project_map_layers;
DROP POLICY IF EXISTS "Admins and managers can upload map layer files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can update map layer files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can delete map layer files" ON storage.objects;

CREATE POLICY "Managers can insert map layers"
ON public.project_map_layers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_map_layers.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','project_manager','quality_manager')
  )
);

CREATE POLICY "Managers can update map layers"
ON public.project_map_layers FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_map_layers.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','project_manager','quality_manager')
  )
);

CREATE POLICY "Managers can upload map layer files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'map-layers'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','project_manager','quality_manager')
  )
);

CREATE POLICY "Managers can update map layer files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'map-layers'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','project_manager','quality_manager')
  )
);

CREATE POLICY "Managers can delete map layer files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'map-layers'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','project_manager','quality_manager')
  )
);