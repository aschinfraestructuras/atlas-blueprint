
-- Add form schema and form data columns for dynamic form documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS form_schema jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.documents.form_schema IS 'JSON schema defining form fields for form-type documents';
COMMENT ON COLUMN public.documents.form_data IS 'JSON payload storing form submission data';
