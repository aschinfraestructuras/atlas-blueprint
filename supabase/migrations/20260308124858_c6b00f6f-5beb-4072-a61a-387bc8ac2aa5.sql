ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS contact_name  text NULL,
  ADD COLUMN IF NOT EXISTS contact_phone text NULL,
  ADD COLUMN IF NOT EXISTS notes         text NULL;