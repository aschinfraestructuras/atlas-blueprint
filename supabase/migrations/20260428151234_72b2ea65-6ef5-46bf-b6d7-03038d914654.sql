-- Create private 'signatures' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects scoped to project membership
-- Path format: {project_id}/{worker_id}.png  → first folder = project_id

CREATE POLICY "Project members can view signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signatures'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
  )
);

CREATE POLICY "Project members can upload signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
  )
);

CREATE POLICY "Project members can update signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
  )
);

CREATE POLICY "Project members can delete signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
  )
);