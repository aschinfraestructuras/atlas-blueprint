ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contractor text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_number text;