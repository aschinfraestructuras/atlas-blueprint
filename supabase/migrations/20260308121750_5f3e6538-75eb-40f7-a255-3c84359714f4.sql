ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS code          text        NULL,
  ADD COLUMN IF NOT EXISTS discipline    text        NULL,
  ADD COLUMN IF NOT EXISTS responsible   text        NULL,
  ADD COLUMN IF NOT EXISTS approval_date date        NULL,
  ADD COLUMN IF NOT EXISTS doc_reference text        NULL,
  ADD COLUMN IF NOT EXISTS notes         text        NULL;

CREATE UNIQUE INDEX IF NOT EXISTS plans_project_code_unique
  ON public.plans(project_id, code)
  WHERE code IS NOT NULL;