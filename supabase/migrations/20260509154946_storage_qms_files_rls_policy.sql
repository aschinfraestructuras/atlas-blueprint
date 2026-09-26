DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated can upload qms-files' AND tablename = 'objects') THEN
    CREATE POLICY "authenticated can upload qms-files"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'qms-files');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated can read qms-files' AND tablename = 'objects') THEN
    CREATE POLICY "authenticated can read qms-files"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'qms-files');
  END IF;
END $$;
