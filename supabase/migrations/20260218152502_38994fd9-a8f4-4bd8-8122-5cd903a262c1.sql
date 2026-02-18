
-- Clear stale file_path values where the storage object no longer exists
-- (objects with 'projects/' prefix are orphaned — storage was already cleared)
UPDATE public.documents
SET file_path = NULL, file_name = NULL, file_size = NULL, mime_type = NULL
WHERE file_path LIKE 'projects/%';

-- Clear stale file_path in attachments
DELETE FROM public.attachments
WHERE file_path LIKE 'projects/%';
